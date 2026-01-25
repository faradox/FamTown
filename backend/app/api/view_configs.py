"""
View configuration API: list all view configs for current user, upsert per view,
and upload/delete background images that are stored as static files (not in DB).
"""

import uuid
import logging
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, UploadFile, File as FastAPIFile, HTTPException, Form
from pydantic import BaseModel
from sqlalchemy import select, delete

from database import db_manager, ViewConfig, User
from app.services.auth_service import get_current_user
from app.services.file_service import file_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/view-configs", tags=["view-configs"])


class ViewConfigModel(BaseModel):
    id: str
    viewName: str
    config: dict
    createdAt: str
    updatedAt: str
    isOwner: bool


class UpsertViewConfigRequest(BaseModel):
    viewName: str
    config: dict


@router.get("", response_model=List[ViewConfigModel])
async def list_view_configs(current_user: User = Depends(get_current_user)):
    """Return effective configs per view (user overrides, otherwise first available)."""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(ViewConfig).order_by(ViewConfig.viewName.asc(), ViewConfig.createdAt.asc())
        )
        rows = result.scalars().all()

        # Build a map of viewName -> effective config with per-user override
        effective_configs = {}
        for row in rows:
            if row.viewName not in effective_configs:
                effective_configs[row.viewName] = row
            if row.userId == current_user.id:
                effective_configs[row.viewName] = row

        return [
            ViewConfigModel(
                id=row.id,
                viewName=row.viewName,
                config=row.config or {},
                createdAt=row.createdAt.isoformat(),
                updatedAt=row.updatedAt.isoformat(),
                isOwner=row.userId == current_user.id,
            )
            for row in sorted(effective_configs.values(), key=lambda row: row.viewName)
        ]


@router.post("", response_model=ViewConfigModel)
async def upsert_view_config(
    payload: UpsertViewConfigRequest,
    current_user: User = Depends(get_current_user),
):
    """Create or update a view config for a given viewName for the current user."""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(ViewConfig).where(
                ViewConfig.userId == current_user.id,
                ViewConfig.viewName == payload.viewName,
            )
        )
        row = result.scalar_one_or_none()
        if row is None:
            row = ViewConfig(
                id=str(uuid.uuid4()),
                userId=current_user.id,
                viewName=payload.viewName,
                config=payload.config or {},
            )
            session.add(row)
        else:
            row.config = payload.config or {}

        await session.commit()
        await session.refresh(row)
        return ViewConfigModel(
            id=row.id,
            viewName=row.viewName,
            config=row.config or {},
            createdAt=row.createdAt.isoformat(),
            updatedAt=row.updatedAt.isoformat(),
            isOwner=True,
        )


@router.post("/background", response_model=dict)
async def upload_background(
    viewName: Annotated[str, Form()],
    file: UploadFile = FastAPIFile(...),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a background image for a view for the current user. This overwrites previous ones.
    Returns: { path: str }
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    saved = await file_service.save_view_background(current_user.id, viewName, file)

    # Also upsert the view config to reference the background path and indicate type
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(ViewConfig).where(
                ViewConfig.userId == current_user.id,
                ViewConfig.viewName == viewName,
            )
        )
        row = result.scalar_one_or_none()
        if row is None:
            row = ViewConfig(
                id=str(uuid.uuid4()),
                userId=current_user.id,
                viewName=viewName,
                config={"backgroundType": "image", "backgroundPath": saved["path"]},
            )
            session.add(row)
        else:
            cfg = dict(row.config or {})
            cfg.update({"backgroundType": "image", "backgroundPath": saved["path"]})
            row.config = cfg
        await session.commit()

    return {"path": saved["path"]}


@router.delete("/{viewName}", response_model=Optional[ViewConfigModel])
async def delete_view_config(
    viewName: str,
    current_user: User = Depends(get_current_user),
):
    """Delete the current user's config for the given view and return fallback if any."""
    async with db_manager.get_session() as session:
        await session.execute(
            delete(ViewConfig).where(
                ViewConfig.userId == current_user.id,
                ViewConfig.viewName == viewName,
            )
        )

        result = await session.execute(
            select(ViewConfig)
            .where(ViewConfig.viewName == viewName)
            .order_by(ViewConfig.viewName.asc(), ViewConfig.createdAt.asc())
        )
        fallback = result.scalars().first()

        await session.commit()

        if fallback is None:
            return None

        return ViewConfigModel(
            id=fallback.id,
            viewName=fallback.viewName,
            config=fallback.config or {},
            createdAt=fallback.createdAt.isoformat(),
            updatedAt=fallback.updatedAt.isoformat(),
            isOwner=fallback.userId == current_user.id,
        )
