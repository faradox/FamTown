"""
Pictures API endpoints
"""

import uuid
import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from pydantic import BaseModel
from sqlalchemy import select, delete

from database import db_manager, User, Picture
from app.services.auth_service import get_current_user
from app.services.file_service import file_service
from app.services.websocket_service import ws_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/pictures", tags=["pictures"])


class PictureResponse(BaseModel):
    id: str
    filename: str
    path: str
    caption: Optional[str]
    createdBy: str
    createdAt: str
    updatedAt: str


@router.post("", response_model=PictureResponse)
async def upload_picture(
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    """Upload a new picture"""
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Save file
    file_data = await file_service.save_picture(file)
    
    # Create database entry
    picture_id = str(uuid.uuid4())
    
    async with db_manager.get_session() as session:
        picture = Picture(
            id=picture_id,
            filename=file_data["filename"],
            path=file_data["path"],
            caption=caption,
            createdBy=current_user.id
        )
        
        session.add(picture)
        await session.commit()
        await session.refresh(picture)
        
        response = PictureResponse(
            id=picture.id,
            filename=picture.filename,
            path=picture.path,
            caption=picture.caption,
            createdBy=picture.createdBy,
            createdAt=picture.createdAt.isoformat(),
            updatedAt=picture.updatedAt.isoformat()
        )
        
        # Broadcast to WebSocket clients
        await ws_manager.send_object_created("picture", response.dict())
        
        return response


@router.get("", response_model=List[PictureResponse])
async def list_pictures(
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1, description="Page number for paginated results"),
    page_size: Optional[int] = Query(
        None,
        ge=1,
        le=100,
        description="Number of items per page. When omitted, all pictures are returned.",
    ),
    sort: str = Query(
        "desc",
        pattern="^(asc|desc)$",
        description="Sort order for picture creation date.",
    ),
):
    """List pictures with optional pagination and sorting."""
    async with db_manager.get_session() as session:
        order_by_clause = Picture.createdAt.asc() if sort == "asc" else Picture.createdAt.desc()

        query = select(Picture).order_by(order_by_clause)

        if page_size is not None:
            offset = (page - 1) * page_size
            query = query.offset(offset).limit(page_size)

        result = await session.execute(query)
        pictures = result.scalars().all()

        return [
            PictureResponse(
                id=picture.id,
                filename=picture.filename,
                path=picture.path,
                caption=picture.caption,
                createdBy=picture.createdBy,
                createdAt=picture.createdAt.isoformat(),
                updatedAt=picture.updatedAt.isoformat()
            )
            for picture in pictures
        ]


@router.get("/{picture_id}", response_model=PictureResponse)
async def get_picture(picture_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific picture"""
    async with db_manager.get_session() as session:
        result = await session.execute(select(Picture).where(Picture.id == picture_id))
        picture = result.scalar_one_or_none()
        
        if not picture:
            raise HTTPException(status_code=404, detail="Picture not found")
        
        return PictureResponse(
            id=picture.id,
            filename=picture.filename,
            path=picture.path,
            caption=picture.caption,
            createdBy=picture.createdBy,
            createdAt=picture.createdAt.isoformat(),
            updatedAt=picture.updatedAt.isoformat()
        )


@router.put("/{picture_id}", response_model=PictureResponse)
async def update_picture(
    picture_id: str,
    caption: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    """Update picture caption"""
    async with db_manager.get_session() as session:
        result = await session.execute(select(Picture).where(Picture.id == picture_id))
        picture = result.scalar_one_or_none()
        
        if not picture:
            raise HTTPException(status_code=404, detail="Picture not found")
        
        if caption is not None:
            picture.caption = caption
        
        await session.commit()
        await session.refresh(picture)
        
        response = PictureResponse(
            id=picture.id,
            filename=picture.filename,
            path=picture.path,
            caption=picture.caption,
            createdBy=picture.createdBy,
            createdAt=picture.createdAt.isoformat(),
            updatedAt=picture.updatedAt.isoformat()
        )
        
        # Broadcast to WebSocket clients
        await ws_manager.send_object_updated("picture", response.dict())
        
        return response


@router.delete("/{picture_id}")
async def delete_picture(picture_id: str, current_user: User = Depends(get_current_user)):
    """Delete a picture"""
    async with db_manager.get_session() as session:
        result = await session.execute(select(Picture).where(Picture.id == picture_id))
        picture = result.scalar_one_or_none()
        
        if not picture:
            raise HTTPException(status_code=404, detail="Picture not found")
        
        # Delete file from filesystem
        file_service.delete_file(picture.path)
        
        # Delete from database
        await session.execute(delete(Picture).where(Picture.id == picture_id))
        await session.commit()
        
        # Broadcast to WebSocket clients
        await ws_manager.send_object_deleted("picture", picture_id)
        
        return {"success": True, "message": "Picture deleted"}

