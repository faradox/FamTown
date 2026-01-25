"""
Townsquare API endpoints
"""

import uuid
import logging
from typing import List, Optional, Set
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import select, delete

from database import db_manager, User, TownsquareItem, Event, Picture, File, Text
from app.services.auth_service import get_current_user
from app.services.websocket_service import ws_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/townsquare", tags=["townsquare"])


class TownsquareItemCreate(BaseModel):
    objectType: str  # event, picture, file, text
    objectId: str
    x: int
    y: int
    width: int
    height: int
    zIndex: int = 0
    rotation: int = 0
    itemMetadata: Optional[dict] = None


class TownsquareItemUpdate(BaseModel):
    x: Optional[int] = None
    y: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    zIndex: Optional[int] = None
    rotation: Optional[int] = None
    itemMetadata: Optional[dict] = None


class TownsquareItemResponse(BaseModel):
    id: str
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


@router.post("", response_model=TownsquareItemResponse)
async def add_to_townsquare(
    item_data: TownsquareItemCreate,
    current_user: User = Depends(get_current_user)
):
    """Add an object to the townsquare"""
    item_id = str(uuid.uuid4())

    async with db_manager.get_session() as session:
        item = TownsquareItem(
            id=item_id,
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
        
        response = TownsquareItemResponse(
            id=item.id,
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
        await ws_manager.send_townsquare_updated(response.dict())
        
        return response


@router.get("", response_model=List[TownsquareItemResponse])
async def get_townsquare_items(current_user: User = Depends(get_current_user)):
    """Get all items on the townsquare"""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(TownsquareItem).order_by(TownsquareItem.zIndex)
        )
        items = result.scalars().all()
        
        return [
            TownsquareItemResponse(
                id=item.id,
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


class ObjectsBundle(BaseModel):
    events: List[dict]
    pictures: List[dict]
    files: List[dict]
    texts: List[dict]


class TownsquareCombinedResponse(BaseModel):
    items: List[TownsquareItemResponse]
    objects: ObjectsBundle


@router.get("/combined", response_model=TownsquareCombinedResponse)
async def get_townsquare_with_objects(current_user: User = Depends(get_current_user)):
    """Get townsquare items plus only the related objects referenced by them.

    This avoids fetching full collections (events, pictures, files, texts).
    """
    async with db_manager.get_session() as session:
        # Load items
        items_result = await session.execute(
            select(TownsquareItem).order_by(TownsquareItem.zIndex)
        )
        items = items_result.scalars().all()

        # Collect referenced IDs by type
        event_ids: Set[str] = set()
        picture_ids: Set[str] = set()
        file_ids: Set[str] = set()
        text_ids: Set[str] = set()

        for item in items:
            if item.objectType == "event":
                event_ids.add(item.objectId)
            elif item.objectType == "picture":
                picture_ids.add(item.objectId)
            elif item.objectType == "file":
                file_ids.add(item.objectId)
            elif item.objectType == "text":
                text_ids.add(item.objectId)

        # Fetch only needed records per type
        events_list: List[dict] = []
        pictures_list: List[dict] = []
        files_list: List[dict] = []
        texts_list: List[dict] = []

        if event_ids:
            ev_result = await session.execute(select(Event).where(Event.id.in_(event_ids)))
            for ev in ev_result.scalars().all():
                events_list.append({
                    "id": ev.id,
                    "title": ev.title,
                    "description": ev.description,
                    "startDate": ev.startDate.isoformat() if ev.startDate else None,
                    "endDate": ev.endDate.isoformat() if ev.endDate else None,
                    "location": ev.location,
                    "createdBy": ev.createdBy,
                    "createdAt": ev.createdAt.isoformat() if ev.createdAt else None,
                    "updatedAt": ev.updatedAt.isoformat() if ev.updatedAt else None,
                })

        if picture_ids:
            pic_result = await session.execute(select(Picture).where(Picture.id.in_(picture_ids)))
            for pic in pic_result.scalars().all():
                pictures_list.append({
                    "id": pic.id,
                    "filename": pic.filename,
                    "path": pic.path,
                    "caption": pic.caption,
                    "createdBy": pic.createdBy,
                    "createdAt": pic.createdAt.isoformat(),
                    "updatedAt": pic.updatedAt.isoformat(),
                })

        if file_ids:
            file_result = await session.execute(select(File).where(File.id.in_(file_ids)))
            for f in file_result.scalars().all():
                files_list.append({
                    "id": f.id,
                    "filename": f.filename,
                    "path": f.path,
                    "mimeType": f.mimeType,
                    "size": f.size,
                    "createdBy": f.createdBy,
                    "createdAt": f.createdAt.isoformat(),
                    "updatedAt": f.updatedAt.isoformat(),
                })

        if text_ids:
            text_result = await session.execute(select(Text).where(Text.id.in_(text_ids)))
            for t in text_result.scalars().all():
                texts_list.append({
                    "id": t.id,
                    "content": t.content,
                    "textType": t.textType,
                    "createdBy": t.createdBy,
                    "createdAt": t.createdAt.isoformat(),
                    "updatedAt": t.updatedAt.isoformat(),
                })

        # Build items payload
        items_payload = [
            TownsquareItemResponse(
                id=item.id,
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
                updatedAt=item.updatedAt.isoformat(),
            )
            for item in items
        ]

        return TownsquareCombinedResponse(
            items=items_payload,
            objects=ObjectsBundle(
                events=events_list,
                pictures=pictures_list,
                files=files_list,
                texts=texts_list,
            ),
        )


@router.put("/{item_id}", response_model=TownsquareItemResponse)
async def update_townsquare_item(
    item_id: str,
    item_data: TownsquareItemUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a townsquare item (position, size, etc.)"""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(TownsquareItem).where(TownsquareItem.id == item_id)
        )
        item = result.scalar_one_or_none()
        
        if not item:
            raise HTTPException(status_code=404, detail="Townsquare item not found")
        
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
        
        response = TownsquareItemResponse(
            id=item.id,
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
        await ws_manager.send_townsquare_updated(response.dict())
        
        return response


@router.delete("/{item_id}")
async def remove_from_townsquare(
    item_id: str,
    current_user: User = Depends(get_current_user)
):
    """Remove an item from the townsquare"""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(TownsquareItem).where(TownsquareItem.id == item_id)
        )
        item = result.scalar_one_or_none()
        
        if not item:
            raise HTTPException(status_code=404, detail="Townsquare item not found")
        
        await session.execute(delete(TownsquareItem).where(TownsquareItem.id == item_id))
        await session.commit()
        
        # Broadcast to WebSocket clients
        await ws_manager.send_townsquare_updated({"deleted": item_id})
        
        return {"success": True, "message": "Item removed from townsquare"}

