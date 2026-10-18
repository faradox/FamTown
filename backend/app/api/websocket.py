"""
WebSocket API endpoint for real-time updates
"""

import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from app.services.auth_service import get_user_by_token
from app.services.websocket_service import ws_manager

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])

# Seconds a client has to authenticate after connecting
AUTH_TIMEOUT_SECONDS = 10


async def _authenticate(websocket: WebSocket) -> bool:
    """Wait for the client's first message: {"type": "auth", "token": "<jwt>"}"""
    try:
        raw = await asyncio.wait_for(websocket.receive_text(), AUTH_TIMEOUT_SECONDS)
        message = json.loads(raw)
    except (asyncio.TimeoutError, ValueError):
        return False
    if not isinstance(message, dict) or message.get("type") != "auth":
        return False
    token = message.get("token")
    if not isinstance(token, str) or not token:
        return False
    return await get_user_by_token(token) is not None


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates (requires auth as first message)"""
    await websocket.accept()

    try:
        if not await _authenticate(websocket):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        ws_manager.register(websocket)
        await websocket.send_text(json.dumps({"type": "auth_ok"}))

        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        ws_manager.disconnect(websocket)
