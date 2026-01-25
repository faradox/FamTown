"""
GenAI service for generating images using Google Gemini.
"""

import asyncio
import base64
import logging
from typing import Optional

from config import settings

try:
    # google-genai >= 1.36.0
    from google import genai
    from google.genai import types as genai_types
except Exception as e:  # pragma: no cover - import-time guard
    genai = None
    genai_types = None


logger = logging.getLogger(__name__)


class GenAIService:
    """
    Service encapsulating Gemini image generation.
    """

    def __init__(self, api_key: Optional[str]):
        self.gemini_client = None
        self.gemini_image_client = None
        self.enabled = False

        if not api_key:
            logger.warning("GEMINI_API_KEY is not set; GenAI image generation will be disabled")
            return
        if genai is None:
            logger.warning("google-genai is not available; GenAI image generation will be disabled")
            return

        # Separate clients to mirror reference snippet (can share key)
        self.gemini_client = genai.Client(api_key=api_key)
        self.gemini_image_client = genai.Client(api_key=api_key)
        self.enabled = True

    async def generate_image(self, prompt: str, model: str = "gemini-2.5-flash-image") -> bytes:
        """
        Generate an image using Gemini API with a simple text prompt.

        Args:
            prompt: Text description of the image to generate
            model: Gemini model name (default: gemini-2.5-flash-image)

        Returns:
            bytes: Raw image data (PNG format when available)
        """
        if not prompt or not prompt.strip():
            raise ValueError("Prompt is required")
        if self.gemini_image_client is None:
            raise ValueError("GenAI client not initialized")

        loop = asyncio.get_event_loop()

        def _call():
            return self.gemini_image_client.models.generate_content(
                model=model,
                contents=[prompt],
                config=genai_types.GenerateContentConfig(
                    image_config=genai_types.ImageConfig(
                        aspect_ratio="16:9",
                    )
                ),
            )

        response = await loop.run_in_executor(None, _call)

        # Validate response structure
        candidates = getattr(response, "candidates", None)
        if not candidates:
            raise ValueError("No candidates in Gemini response")

        parts = getattr(candidates[0].content, "parts", None)
        if not parts:
            raise ValueError("No parts in Gemini response")

        for part in parts:
            inline = getattr(part, "inline_data", None)
            if inline and getattr(inline, "data", None):
                data = inline.data
                # Some SDKs return base64, some bytes
                try:
                    return base64.b64decode(data)
                except Exception:
                    if isinstance(data, (bytes, bytearray)):
                        return bytes(data)
                    # Last resort: if it's a str that isn't base64, treat as bytes via utf-8
                    return str(data).encode("utf-8")

        raise ValueError("No image data found in Gemini response")


# Global service instance
genai_service = GenAIService(api_key=settings.GEMINI_API_KEY)


