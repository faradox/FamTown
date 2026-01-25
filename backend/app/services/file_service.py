"""
File service for handling file uploads, storage, and retrieval
"""

import os
import uuid
import shutil
import logging
from pathlib import Path
from typing import Optional
from fastapi import UploadFile
import mimetypes

from config import settings

logger = logging.getLogger(__name__)


class FileService:
    """Service for managing file uploads and storage"""
    
    def __init__(self):
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.pictures_dir = self.upload_dir / "pictures"
        self.files_dir = self.upload_dir / "files"
        self.avatars_dir = self.upload_dir / "avatars"
        self.backgrounds_dir = self.upload_dir / "backgrounds"

        # Ensure directories exist
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.pictures_dir.mkdir(parents=True, exist_ok=True)
        self.files_dir.mkdir(parents=True, exist_ok=True)
        self.avatars_dir.mkdir(parents=True, exist_ok=True)
        self.backgrounds_dir.mkdir(parents=True, exist_ok=True)
    
    async def save_picture(self, file: UploadFile) -> dict:
        """
        Save an uploaded picture file
        
        Returns:
            dict with filename, path, size
        """
        file_id = str(uuid.uuid4())
        file_extension = Path(file.filename).suffix if file.filename else ""
        unique_filename = f"{file_id}{file_extension}"
        file_path = self.pictures_dir / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get file size
        file_size = file_path.stat().st_size
        
        logger.info(f"Saved picture: {unique_filename} ({file_size} bytes)")
        
        return {
            "filename": file.filename,
            "path": str(file_path.relative_to(self.upload_dir)),
            "size": file_size
        }
    
    async def save_file(self, file: UploadFile) -> dict:
        """
        Save an uploaded file
        
        Returns:
            dict with filename, path, mimeType, size
        """
        file_id = str(uuid.uuid4())
        file_extension = Path(file.filename).suffix if file.filename else ""
        unique_filename = f"{file_id}{file_extension}"
        file_path = self.files_dir / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get file size and mime type
        file_size = file_path.stat().st_size
        mime_type = file.content_type or mimetypes.guess_type(file.filename)[0]
        
        logger.info(f"Saved file: {unique_filename} ({file_size} bytes, {mime_type})")
        
        return {
            "filename": file.filename,
            "path": str(file_path.relative_to(self.upload_dir)),
            "mimeType": mime_type,
            "size": file_size
        }
    
    def delete_file(self, relative_path: str) -> bool:
        """
        Delete a file given its relative path
        
        Args:
            relative_path: Path relative to upload directory
            
        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            file_path = self.upload_dir / relative_path
            if file_path.exists():
                file_path.unlink()
                logger.info(f"Deleted file: {relative_path}")
                return True
            else:
                logger.warning(f"File not found for deletion: {relative_path}")
                return False
        except Exception as e:
            logger.error(f"Error deleting file {relative_path}: {e}")
            return False
    
    def get_file_path(self, relative_path: str) -> Optional[Path]:
        """
        Get the full path to a file

        Args:
            relative_path: Path relative to upload directory

        Returns:
            Full path or None if file doesn't exist
        """
        file_path = self.upload_dir / relative_path
        if file_path.exists():
            return file_path
        return None

    async def save_view_background(self, user_id: str, view_name: str, file: UploadFile) -> dict:
        """
        Save/overwrite a per-user per-view background image in uploads/backgrounds.

        The image is not tracked in the database; only the path is returned.
        """
        # Delete existing background for this user/view regardless of extension
        safe_view = view_name.replace("/", "_")
        try:
            for existing in self.backgrounds_dir.glob(f"{user_id}_{safe_view}.*"):
                try:
                    existing.unlink()
                    logger.info(f"Deleted existing background: {existing.name}")
                except Exception as e:
                    logger.warning(f"Failed to delete background {existing}: {e}")
        except Exception as e:
            logger.warning(f"Background cleanup failed for {user_id}/{view_name}: {e}")

        # Determine extension
        file_extension = Path(file.filename).suffix if file.filename else ""
        if not file_extension:
            if file.content_type and "/" in file.content_type:
                guessed = file.content_type.split("/")[-1]
                file_extension = f".{guessed}"
            else:
                file_extension = ".jpg"

        filename = f"{user_id}_{safe_view}{file_extension}"
        file_path = self.backgrounds_dir / filename

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = file_path.stat().st_size
        rel_path = str(file_path.relative_to(self.upload_dir))
        logger.info(f"Saved background for {user_id}/{view_name}: {rel_path} ({file_size} bytes)")
        return {"path": rel_path, "size": file_size}

    async def save_avatar(self, file: UploadFile, user_id: str) -> dict:
        """
        Save an uploaded avatar file (overwrites existing avatar for user)

        Args:
            file: The uploaded file
            user_id: The user ID (used as filename to ensure one avatar per user)

        Returns:
            dict with filename, path, size
        """
        file_extension = Path(file.filename).suffix if file.filename else ".jpg"
        # Use user_id as filename to ensure only one avatar per user
        unique_filename = f"{user_id}{file_extension}"
        file_path = self.avatars_dir / unique_filename

        # Delete existing avatar if it exists (with any extension)
        for existing_file in self.avatars_dir.glob(f"{user_id}.*"):
            if existing_file.exists():
                existing_file.unlink()
                logger.info(f"Deleted old avatar: {existing_file.name}")

        # Save new avatar
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Get file size
        file_size = file_path.stat().st_size

        logger.info(f"Saved avatar: {unique_filename} ({file_size} bytes)")

        return {
            "filename": unique_filename,
            "path": str(file_path.relative_to(self.upload_dir)),
            "size": file_size
        }


# Global file service instance
file_service = FileService()

