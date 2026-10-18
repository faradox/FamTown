"""
Files API endpoints
"""

import uuid
import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File as FastAPIFile
from fastapi.responses import FileResponse as FastAPIFileResponse
from pydantic import BaseModel
from sqlalchemy import select, delete

from database import db_manager, User, File
from app.services.auth_service import get_current_user
from app.services.file_service import file_service
from app.services.websocket_service import ws_manager
from app.services.placement_service import remove_placements, broadcast_placement_removals

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/files", tags=["files"])


class FileResponse(BaseModel):
    id: str
    filename: str
    path: str
    mimeType: Optional[str]
    size: Optional[int]
    createdBy: str
    createdAt: str
    updatedAt: str


class FileUpdateRequest(BaseModel):
    filename: str


@router.post("", response_model=FileResponse)
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    current_user: User = Depends(get_current_user)
):
    """Upload a new file"""
    # Save file
    file_data = await file_service.save_file(file)
    
    # Create database entry
    file_id = str(uuid.uuid4())
    
    async with db_manager.get_session() as session:
        file_obj = File(
            id=file_id,
            filename=file_data["filename"],
            path=file_data["path"],
            mimeType=file_data["mimeType"],
            size=file_data["size"],
            createdBy=current_user.id
        )
        
        session.add(file_obj)
        await session.commit()
        await session.refresh(file_obj)
        
        response = FileResponse(
            id=file_obj.id,
            filename=file_obj.filename,
            path=file_obj.path,
            mimeType=file_obj.mimeType,
            size=file_obj.size,
            createdBy=file_obj.createdBy,
            createdAt=file_obj.createdAt.isoformat(),
            updatedAt=file_obj.updatedAt.isoformat()
        )
        
        # Broadcast to WebSocket clients
        await ws_manager.send_object_created("file", response.dict())
        
        return response


@router.get("", response_model=List[FileResponse])
async def list_files(current_user: User = Depends(get_current_user)):
    """List all files"""
    async with db_manager.get_session() as session:
        result = await session.execute(select(File).order_by(File.createdAt.desc()))
        files = result.scalars().all()
        
        return [
            FileResponse(
                id=file_obj.id,
                filename=file_obj.filename,
                path=file_obj.path,
                mimeType=file_obj.mimeType,
                size=file_obj.size,
                createdBy=file_obj.createdBy,
                createdAt=file_obj.createdAt.isoformat(),
                updatedAt=file_obj.updatedAt.isoformat()
            )
            for file_obj in files
        ]


@router.get("/{file_id}", response_model=FileResponse)
async def get_file_info(file_id: str, current_user: User = Depends(get_current_user)):
    """Get file information"""
    async with db_manager.get_session() as session:
        result = await session.execute(select(File).where(File.id == file_id))
        file_obj = result.scalar_one_or_none()

        if not file_obj:
            raise HTTPException(status_code=404, detail="File not found")

        return FileResponse(
            id=file_obj.id,
            filename=file_obj.filename,
            path=file_obj.path,
            mimeType=file_obj.mimeType,
            size=file_obj.size,
            createdBy=file_obj.createdBy,
            createdAt=file_obj.createdAt.isoformat(),
            updatedAt=file_obj.updatedAt.isoformat()
        )


@router.put("/{file_id}", response_model=FileResponse)
async def update_file(
    file_id: str,
    update_data: FileUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    """Update file metadata"""
    async with db_manager.get_session() as session:
        result = await session.execute(select(File).where(File.id == file_id))
        file_obj = result.scalar_one_or_none()

        if not file_obj:
            raise HTTPException(status_code=404, detail="File not found")

        # Update filename
        file_obj.filename = update_data.filename

        await session.commit()
        await session.refresh(file_obj)

        response = FileResponse(
            id=file_obj.id,
            filename=file_obj.filename,
            path=file_obj.path,
            mimeType=file_obj.mimeType,
            size=file_obj.size,
            createdBy=file_obj.createdBy,
            createdAt=file_obj.createdAt.isoformat(),
            updatedAt=file_obj.updatedAt.isoformat()
        )

        # Broadcast to WebSocket clients
        await ws_manager.send_object_updated("file", response.dict())

        return response


@router.get("/{file_id}/download")
async def download_file(file_id: str, current_user: User = Depends(get_current_user)):
    """Download a file"""
    async with db_manager.get_session() as session:
        result = await session.execute(select(File).where(File.id == file_id))
        file_obj = result.scalar_one_or_none()
        
        if not file_obj:
            raise HTTPException(status_code=404, detail="File not found")
        
        file_path = file_service.get_file_path(file_obj.path)
        
        if not file_path:
            raise HTTPException(status_code=404, detail="File not found on disk")

        return FastAPIFileResponse(
            path=str(file_path),
            filename=file_obj.filename,
            media_type=file_obj.mimeType or "application/octet-stream"
        )


@router.delete("/{file_id}")
async def delete_file(file_id: str, current_user: User = Depends(get_current_user)):
    """Delete a file"""
    async with db_manager.get_session() as session:
        result = await session.execute(select(File).where(File.id == file_id))
        file_obj = result.scalar_one_or_none()
        
        if not file_obj:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Delete file from filesystem
        file_service.delete_file(file_obj.path)
        
        # Delete from database
        removed = await remove_placements(session, "file", file_id)
        await session.execute(delete(File).where(File.id == file_id))
        await session.commit()
        await broadcast_placement_removals(removed)
        
        # Broadcast to WebSocket clients
        await ws_manager.send_object_deleted("file", file_id)
        
        return {"success": True, "message": "File deleted"}

