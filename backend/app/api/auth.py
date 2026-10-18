"""
Authentication API endpoints
"""

import time
import uuid
import logging
from collections import defaultdict, deque
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request, status, UploadFile, File
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, EmailStr
from typing import Optional
from sqlalchemy import select, func
from pathlib import Path

from database import db_manager, User, PasswordResetToken
from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)
from app.services.file_service import file_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])

# Failed-login throttling (in-process; the app runs a single worker)
LOGIN_MAX_FAILURES = 10
LOGIN_WINDOW_SECONDS = 15 * 60
_failed_logins: dict[str, deque] = defaultdict(deque)

# Verified against when the email is unknown, so both paths cost one bcrypt check
_DUMMY_PASSWORD_HASH = hash_password(uuid.uuid4().hex)


def _client_ip(request: Request) -> str:
    # Host nginx sets X-Real-IP; the backend port is only reachable via loopback
    return request.headers.get("x-real-ip") or (
        request.client.host if request.client else "unknown"
    )


def _recent_failures(ip: str) -> deque:
    failures = _failed_logins[ip]
    cutoff = time.monotonic() - LOGIN_WINDOW_SECONDS
    while failures and failures[0] < cutoff:
        failures.popleft()
    if not failures:
        del _failed_logins[ip]
    return failures


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    user: dict
    token: str
    message: str = "Login successful"


class ProfileResponse(BaseModel):
    id: str
    name: str
    username: str
    email: str
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    avatar: Optional[str] = None
    hasAvatar: bool = False
    interests: Optional[str] = None


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    interests: Optional[str] = None


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, http_request: Request):
    """Login endpoint"""
    ip = _client_ip(http_request)
    if len(_recent_failures(ip)) >= LOGIN_MAX_FAILURES:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Try again later.",
        )

    async with db_manager.get_session() as session:
        result = await session.execute(
            select(User).where(func.lower(User.email) == request.email.strip().lower())
        )
        user = result.scalar_one_or_none()

        password_hash = user.passwordHash if user else _DUMMY_PASSWORD_HASH
        password_ok = await run_in_threadpool(
            verify_password, request.password, password_hash
        )
        if not user or not password_ok:
            _failed_logins[ip].append(time.monotonic())
            logger.warning(f"Failed login attempt from {ip}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        # Update last login
        user.lastLogin = datetime.now(timezone.utc)
        await session.commit()

        # Create JWT token
        token = create_access_token(user.id)

        # Check if avatar file exists
        has_avatar = False
        if user.avatar:
            avatar_path = file_service.get_file_path(user.avatar)
            has_avatar = avatar_path is not None and avatar_path.exists()

        # Construct name from firstName/lastName or use username
        name = user.username
        if user.firstName or user.lastName:
            parts = []
            if user.firstName:
                parts.append(user.firstName)
            if user.lastName:
                parts.append(user.lastName)
            if parts:
                name = " ".join(parts)

        return {
            "success": True,
            "user": {
                "id": user.id,
                "name": name,
                "username": user.username,
                "email": user.email,
                "firstName": user.firstName,
                "lastName": user.lastName,
                "avatar": user.avatar,
                "hasAvatar": has_avatar,
                "interests": user.interests
            },
            "token": token,
            "message": "Login successful"
        }


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    # Check if avatar file exists
    has_avatar = False
    if current_user.avatar:
        avatar_path = file_service.get_file_path(current_user.avatar)
        has_avatar = avatar_path is not None and avatar_path.exists()

    # Construct name from firstName/lastName or use username
    name = current_user.username
    if current_user.firstName or current_user.lastName:
        parts = []
        if current_user.firstName:
            parts.append(current_user.firstName)
        if current_user.lastName:
            parts.append(current_user.lastName)
        if parts:
            name = " ".join(parts)

    return {
        "id": current_user.id,
        "name": name,
        "username": current_user.username,
        "email": current_user.email,
        "firstName": current_user.firstName,
        "lastName": current_user.lastName,
        "avatar": current_user.avatar,
        "hasAvatar": has_avatar,
        "interests": current_user.interests
    }


@router.put("/profile", response_model=ProfileResponse)
async def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user)
):
    """Update current user profile"""
    async with db_manager.get_session() as session:
        # Get fresh user from database
        result = await session.execute(
            select(User).where(User.id == current_user.id)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Update fields if provided
        if request.name is not None:
            # Split name into firstName and lastName
            name_parts = request.name.strip().split(maxsplit=1)
            user.firstName = name_parts[0] if len(name_parts) > 0 else None
            user.lastName = name_parts[1] if len(name_parts) > 1 else None

        if request.email is not None:
            # Check if email is already taken
            email_check = await session.execute(
                select(User).where(User.email == request.email, User.id != current_user.id)
            )
            if email_check.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Email already in use")
            user.email = request.email

        if request.interests is not None:
            user.interests = request.interests

        await session.commit()
        await session.refresh(user)

        # Check if avatar file exists
        has_avatar = False
        if user.avatar:
            avatar_path = file_service.get_file_path(user.avatar)
            has_avatar = avatar_path is not None and avatar_path.exists()

        # Construct name
        name = user.username
        if user.firstName or user.lastName:
            parts = []
            if user.firstName:
                parts.append(user.firstName)
            if user.lastName:
                parts.append(user.lastName)
            if parts:
                name = " ".join(parts)

        return {
            "id": user.id,
            "name": name,
            "username": user.username,
            "email": user.email,
            "firstName": user.firstName,
            "lastName": user.lastName,
            "avatar": user.avatar,
            "hasAvatar": has_avatar,
            "interests": user.interests
        }


@router.post("/avatar")
async def upload_avatar(
    avatar: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload user avatar"""
    # Validate file type
    if not avatar.content_type or not avatar.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Validate file size (max 5MB)
    avatar.file.seek(0, 2)  # Seek to end
    file_size = avatar.file.tell()
    avatar.file.seek(0)  # Seek back to start
    if file_size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 5MB")

    # Save avatar
    file_data = await file_service.save_avatar(avatar, current_user.id)

    # Update user avatar path in database
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(User).where(User.id == current_user.id)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.avatar = file_data["path"]
        await session.commit()

    return {"success": True, "message": "Avatar uploaded successfully", "path": file_data["path"]}


@router.get("/avatar/{user_id}")
async def get_avatar(user_id: str):
    """Get user avatar"""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user or not user.avatar:
            raise HTTPException(status_code=404, detail="Avatar not found")

        avatar_path = file_service.get_file_path(user.avatar)
        if not avatar_path or not avatar_path.exists():
            raise HTTPException(status_code=404, detail="Avatar file not found")

        return FileResponse(avatar_path)


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout endpoint (token invalidation handled client-side)"""
    return {"success": True, "message": "Logged out successfully"}

