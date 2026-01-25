"""
GenAI API endpoints (image generation)
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import User
from app.services.auth_service import get_current_user
from app.services.genai_service import genai_service


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/genai", tags=["genai"])


class GenerateImageRequest(BaseModel):
    prompt: str
    model: Optional[str] = "gemini-2.5-flash-image"


class GenerateImageResponse(BaseModel):
    # Return base64 image string for easy transport
    imageBase64: str
    mimeType: str = "image/png"


class GenAIStatusResponse(BaseModel):
    enabled: bool


@router.get("/status", response_model=GenAIStatusResponse)
async def genai_status(current_user: User = Depends(get_current_user)):
    """
    Report whether GenAI features are enabled.
    """
    return GenAIStatusResponse(enabled=bool(genai_service.enabled))


@router.post("/generate-image", response_model=GenerateImageResponse)
async def generate_image(
    body: GenerateImageRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Generate an image from a prompt using Gemini and return base64 data.
    """
    try:
        raw_bytes = await genai_service.generate_image(body.prompt, body.model or "gemini-2.5-flash-image")
        import base64

        b64 = base64.b64encode(raw_bytes).decode("utf-8")
        return GenerateImageResponse(imageBase64=b64)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:  # pragma: no cover - generic runtime guard
        logger.error(f"GenAI image generation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate image")


