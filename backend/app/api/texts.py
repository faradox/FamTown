"""
Texts API endpoints
"""

import uuid
import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, delete

from database import db_manager, User, Text
from app.services.auth_service import get_current_user
from app.services.websocket_service import ws_manager
from app.services.placement_service import remove_placements, broadcast_placement_removals

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/texts", tags=["texts"])


class TextCreate(BaseModel):
    content: str
    textType: str  # wish, insight, recipe, movie_idea, quote


class TextUpdate(BaseModel):
    content: Optional[str] = None
    textType: Optional[str] = None


class TextResponse(BaseModel):
    id: str
    content: str
    textType: str
    createdBy: str
    createdAt: str
    updatedAt: str


@router.post("", response_model=TextResponse)
async def create_text(text_data: TextCreate, current_user: User = Depends(get_current_user)):
    """Create a new text"""
    text_id = str(uuid.uuid4())
    
    async with db_manager.get_session() as session:
        text = Text(
            id=text_id,
            content=text_data.content,
            textType=text_data.textType,
            createdBy=current_user.id
        )
        
        session.add(text)
        await session.commit()
        await session.refresh(text)
        
        response = TextResponse(
            id=text.id,
            content=text.content,
            textType=text.textType,
            createdBy=text.createdBy,
            createdAt=text.createdAt.isoformat(),
            updatedAt=text.updatedAt.isoformat()
        )
        
        # Broadcast to WebSocket clients
        await ws_manager.send_object_created("text", response.dict())
        
        return response


@router.get("", response_model=List[TextResponse])
async def list_texts(
    text_type: Optional[str] = Query(None, description="Filter by text type"),
    page: int = Query(1, ge=1, description="Page number for paginated results"),
    page_size: Optional[int] = Query(
        None,
        ge=1,
        le=100,
        description="Number of items per page. When omitted, all texts are returned.",
    ),
    current_user: User = Depends(get_current_user),
):
    """List texts with optional pagination."""
    async with db_manager.get_session() as session:
        query = select(Text).order_by(Text.createdAt.desc())

        if text_type:
            query = query.where(Text.textType == text_type)

        if page_size is not None:
            offset = (page - 1) * page_size
            query = query.offset(offset).limit(page_size)

        result = await session.execute(query)
        texts = result.scalars().all()

        return [
            TextResponse(
                id=text.id,
                content=text.content,
                textType=text.textType,
                createdBy=text.createdBy,
                createdAt=text.createdAt.isoformat(),
                updatedAt=text.updatedAt.isoformat(),
            )
            for text in texts
        ]


@router.get("/{text_id}", response_model=TextResponse)
async def get_text(text_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific text"""
    async with db_manager.get_session() as session:
        result = await session.execute(select(Text).where(Text.id == text_id))
        text = result.scalar_one_or_none()
        
        if not text:
            raise HTTPException(status_code=404, detail="Text not found")
        
        return TextResponse(
            id=text.id,
            content=text.content,
            textType=text.textType,
            createdBy=text.createdBy,
            createdAt=text.createdAt.isoformat(),
            updatedAt=text.updatedAt.isoformat()
        )


@router.put("/{text_id}", response_model=TextResponse)
async def update_text(
    text_id: str,
    text_data: TextUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a text"""
    async with db_manager.get_session() as session:
        result = await session.execute(select(Text).where(Text.id == text_id))
        text = result.scalar_one_or_none()
        
        if not text:
            raise HTTPException(status_code=404, detail="Text not found")
        
        if text_data.content is not None:
            text.content = text_data.content
        if text_data.textType is not None:
            text.textType = text_data.textType
        
        await session.commit()
        await session.refresh(text)
        
        response = TextResponse(
            id=text.id,
            content=text.content,
            textType=text.textType,
            createdBy=text.createdBy,
            createdAt=text.createdAt.isoformat(),
            updatedAt=text.updatedAt.isoformat()
        )
        
        # Broadcast to WebSocket clients
        await ws_manager.send_object_updated("text", response.dict())
        
        return response


@router.delete("/{text_id}")
async def delete_text(text_id: str, current_user: User = Depends(get_current_user)):
    """Delete a text"""
    async with db_manager.get_session() as session:
        result = await session.execute(select(Text).where(Text.id == text_id))
        text = result.scalar_one_or_none()
        
        if not text:
            raise HTTPException(status_code=404, detail="Text not found")
        
        removed = await remove_placements(session, "text", text_id)
        await session.execute(delete(Text).where(Text.id == text_id))
        await session.commit()
        await broadcast_placement_removals(removed)
        
        # Broadcast to WebSocket clients
        await ws_manager.send_object_deleted("text", text_id)
        
        return {"success": True, "message": "Text deleted"}

