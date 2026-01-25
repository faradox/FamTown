"""
Events API endpoints
"""

import uuid
import logging
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy import select, delete

from database import db_manager, User, Event
from app.services.auth_service import get_current_user
from app.services.websocket_service import ws_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/events", tags=["events"])


class LocationModel(BaseModel):
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    startDate: datetime
    endDate: Optional[datetime] = None
    location: Optional[LocationModel] = None


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    startDate: Optional[datetime] = None
    endDate: Optional[datetime] = None
    location: Optional[LocationModel] = None


class EventResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    startDate: str
    endDate: Optional[str]
    location: Optional[dict]
    createdBy: str
    createdAt: str
    updatedAt: str


@router.post("", response_model=EventResponse)
async def create_event(event_data: EventCreate, current_user: User = Depends(get_current_user)):
    """Create a new event"""
    event_id = str(uuid.uuid4())
    
    async with db_manager.get_session() as session:
        event = Event(
            id=event_id,
            title=event_data.title,
            description=event_data.description,
            startDate=event_data.startDate,
            endDate=event_data.endDate,
            location=event_data.location.dict() if event_data.location else None,
            createdBy=current_user.id
        )
        
        session.add(event)
        await session.commit()
        await session.refresh(event)
        
        response = EventResponse(
            id=event.id,
            title=event.title,
            description=event.description,
            startDate=event.startDate.isoformat() if event.startDate else None,
            endDate=event.endDate.isoformat() if event.endDate else None,
            location=event.location,
            createdBy=event.createdBy,
            createdAt=event.createdAt.isoformat() if event.createdAt else None,
            updatedAt=event.updatedAt.isoformat() if event.updatedAt else None
        )
        
        # Broadcast to WebSocket clients
        await ws_manager.send_object_created("event", response.dict())
        
        return response


@router.get("", response_model=List[EventResponse])
async def list_events(current_user: User = Depends(get_current_user)):
    """List all events"""
    async with db_manager.get_session() as session:
        result = await session.execute(select(Event).order_by(Event.startDate))
        events = result.scalars().all()
        
        return [
            EventResponse(
                id=event.id,
                title=event.title,
                description=event.description,
                startDate=event.startDate.isoformat() if event.startDate else None,
                endDate=event.endDate.isoformat() if event.endDate else None,
                location=event.location,
                createdBy=event.createdBy,
                createdAt=event.createdAt.isoformat() if event.createdAt else None,
                updatedAt=event.updatedAt.isoformat() if event.updatedAt else None
            )
            for event in events
        ]


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific event"""
    async with db_manager.get_session() as session:
        result = await session.execute(select(Event).where(Event.id == event_id))
        event = result.scalar_one_or_none()
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        return EventResponse(
            id=event.id,
            title=event.title,
            description=event.description,
            startDate=event.startDate.isoformat() if event.startDate else None,
            endDate=event.endDate.isoformat() if event.endDate else None,
            location=event.location,
            createdBy=event.createdBy,
            createdAt=event.createdAt.isoformat() if event.createdAt else None,
            updatedAt=event.updatedAt.isoformat() if event.updatedAt else None
        )


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str,
    event_data: EventUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update an event"""
    async with db_manager.get_session() as session:
        result = await session.execute(select(Event).where(Event.id == event_id))
        event = result.scalar_one_or_none()
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Update fields
        if event_data.title is not None:
            event.title = event_data.title
        if event_data.description is not None:
            event.description = event_data.description
        if event_data.startDate is not None:
            event.startDate = event_data.startDate
        if event_data.endDate is not None:
            event.endDate = event_data.endDate
        if event_data.location is not None:
            event.location = event_data.location.dict()
        
        await session.commit()
        await session.refresh(event)
        
        response = EventResponse(
            id=event.id,
            title=event.title,
            description=event.description,
            startDate=event.startDate.isoformat() if event.startDate else None,
            endDate=event.endDate.isoformat() if event.endDate else None,
            location=event.location,
            createdBy=event.createdBy,
            createdAt=event.createdAt.isoformat() if event.createdAt else None,
            updatedAt=event.updatedAt.isoformat() if event.updatedAt else None
        )
        
        # Broadcast to WebSocket clients
        await ws_manager.send_object_updated("event", response.dict())
        
        return response


@router.delete("/{event_id}")
async def delete_event(event_id: str, current_user: User = Depends(get_current_user)):
    """Delete an event"""
    async with db_manager.get_session() as session:
        result = await session.execute(select(Event).where(Event.id == event_id))
        event = result.scalar_one_or_none()
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        await session.execute(delete(Event).where(Event.id == event_id))
        await session.commit()
        
        # Broadcast to WebSocket clients
        await ws_manager.send_object_deleted("event", event_id)
        
        return {"success": True, "message": "Event deleted"}

