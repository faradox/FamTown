"""
Profile API endpoints
"""

import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import select, delete

from database import db_manager, User, ProfileItem
from app.services.auth_service import get_current_user
from app.services.websocket_service import ws_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/profile", tags=["profile"])


class ProfileItemCreate(BaseModel):
    objectType: str  # event, picture, file, text
    objectId: str
    x: int
    y: int
    width: int
    height: int
    zIndex: int = 0
    rotation: int = 0
    itemMetadata: Optional[dict] = None


class ProfileItemUpdate(BaseModel):
    x: Optional[int] = None
    y: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    zIndex: Optional[int] = None
    rotation: Optional[int] = None
    itemMetadata: Optional[dict] = None


class ProfileItemResponse(BaseModel):
    id: str
    userId: str
    objectType: str
    objectId: str
    x: int
    y: int
    width: int
    height: int
    zIndex: int
    rotation: int
    itemMetadata: Optional[dict] = None
    createdAt: str
    updatedAt: str


@router.post("/{user_id}/items", response_model=ProfileItemResponse)
async def add_to_profile(
    user_id: str,
    item_data: ProfileItemCreate,
    current_user: User = Depends(get_current_user)
):
    """Add an object to a user's profile"""
    # Check if current user is the owner of the profile
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only add items to your own profile")

    item_id = str(uuid.uuid4())

    async with db_manager.get_session() as session:
        item = ProfileItem(
            id=item_id,
            userId=user_id,
            objectType=item_data.objectType,
            objectId=item_data.objectId,
            x=item_data.x,
            y=item_data.y,
            width=item_data.width,
            height=item_data.height,
            zIndex=item_data.zIndex,
            rotation=item_data.rotation,
            itemMetadata=item_data.itemMetadata or {}
        )

        session.add(item)
        await session.commit()
        await session.refresh(item)

        response = ProfileItemResponse(
            id=item.id,
            userId=item.userId,
            objectType=item.objectType,
            objectId=item.objectId,
            x=item.x,
            y=item.y,
            width=item.width,
            height=item.height,
            zIndex=item.zIndex,
            rotation=item.rotation,
            itemMetadata=item.itemMetadata,
            createdAt=item.createdAt.isoformat(),
            updatedAt=item.updatedAt.isoformat()
        )

        # Broadcast to WebSocket clients
        await ws_manager.send_profile_updated(user_id, response.dict())

        return response


@router.get("/{user_id}/items", response_model=List[ProfileItemResponse])
async def get_profile_items(user_id: str, current_user: User = Depends(get_current_user)):
    """Get all items on a user's profile"""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(ProfileItem).where(ProfileItem.userId == user_id).order_by(ProfileItem.zIndex)
        )
        items = result.scalars().all()

        return [
            ProfileItemResponse(
                id=item.id,
                userId=item.userId,
                objectType=item.objectType,
                objectId=item.objectId,
                x=item.x,
                y=item.y,
                width=item.width,
                height=item.height,
                zIndex=item.zIndex,
                rotation=item.rotation,
                itemMetadata=item.itemMetadata,
                createdAt=item.createdAt.isoformat(),
                updatedAt=item.updatedAt.isoformat()
            )
            for item in items
        ]


@router.put("/{user_id}/items/{item_id}", response_model=ProfileItemResponse)
async def update_profile_item(
    user_id: str,
    item_id: str,
    item_data: ProfileItemUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a profile item (position, size, etc.)"""
    # Check if current user is the owner of the profile
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only update items on your own profile")

    async with db_manager.get_session() as session:
        result = await session.execute(
            select(ProfileItem).where(ProfileItem.id == item_id, ProfileItem.userId == user_id)
        )
        item = result.scalar_one_or_none()

        if not item:
            raise HTTPException(status_code=404, detail="Profile item not found")

        # Update fields
        if item_data.x is not None:
            item.x = item_data.x
        if item_data.y is not None:
            item.y = item_data.y
        if item_data.width is not None:
            item.width = item_data.width
        if item_data.height is not None:
            item.height = item_data.height
        if item_data.zIndex is not None:
            item.zIndex = item_data.zIndex
        if item_data.rotation is not None:
            item.rotation = item_data.rotation
        if item_data.itemMetadata is not None:
            item.itemMetadata = item_data.itemMetadata

        await session.commit()
        await session.refresh(item)

        response = ProfileItemResponse(
            id=item.id,
            userId=item.userId,
            objectType=item.objectType,
            objectId=item.objectId,
            x=item.x,
            y=item.y,
            width=item.width,
            height=item.height,
            zIndex=item.zIndex,
            rotation=item.rotation,
            itemMetadata=item.itemMetadata,
            createdAt=item.createdAt.isoformat(),
            updatedAt=item.updatedAt.isoformat()
        )

        # Broadcast to WebSocket clients
        await ws_manager.send_profile_updated(user_id, response.dict())

        return response


@router.delete("/{user_id}/items/{item_id}")
async def remove_from_profile(
    user_id: str,
    item_id: str,
    current_user: User = Depends(get_current_user)
):
    """Remove an item from a user's profile"""
    # Check if current user is the owner of the profile
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only remove items from your own profile")

    async with db_manager.get_session() as session:
        result = await session.execute(
            select(ProfileItem).where(ProfileItem.id == item_id, ProfileItem.userId == user_id)
        )
        item = result.scalar_one_or_none()

        if not item:
            raise HTTPException(status_code=404, detail="Profile item not found")

        await session.execute(delete(ProfileItem).where(ProfileItem.id == item_id))
        await session.commit()

        # Broadcast to WebSocket clients
        await ws_manager.send_profile_updated(user_id, {"deleted": item_id})

        return {"success": True, "message": "Item removed from profile"}
