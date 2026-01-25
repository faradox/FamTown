"""
WebSocket service for real-time updates
"""

import json
import logging
from typing import Dict, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages WebSocket connections and broadcasts"""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket):
        """Accept and register a new WebSocket connection"""
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """
        Broadcast a message to all connected clients
        
        Args:
            message: Dictionary with event type and data
        """
        if not self.active_connections:
            return
        
        message_str = json.dumps(message)
        disconnected = set()
        
        for connection in self.active_connections:
            try:
                await connection.send_text(message_str)
            except Exception as e:
                logger.error(f"Error sending message to client: {e}")
                disconnected.add(connection)
        
        # Remove disconnected clients
        for connection in disconnected:
            self.disconnect(connection)
    
    async def send_object_created(self, object_type: str, object_data: dict):
        """Broadcast that an object was created"""
        await self.broadcast({
            "type": "object_created",
            "objectType": object_type,
            "data": object_data
        })
    
    async def send_object_updated(self, object_type: str, object_data: dict):
        """Broadcast that an object was updated"""
        await self.broadcast({
            "type": "object_updated",
            "objectType": object_type,
            "data": object_data
        })
    
    async def send_object_deleted(self, object_type: str, object_id: str):
        """Broadcast that an object was deleted"""
        await self.broadcast({
            "type": "object_deleted",
            "objectType": object_type,
            "objectId": object_id
        })
    
    async def send_townsquare_updated(self, townsquare_data: dict):
        """Broadcast that townsquare was updated"""
        await self.broadcast({
            "type": "townsquare_updated",
            "data": townsquare_data
        })

    async def send_profile_updated(self, user_id: str, profile_data: dict):
        """Broadcast that a profile was updated"""
        await self.broadcast({
            "type": "profile_updated",
            "userId": user_id,
            "data": profile_data
        })


# Global WebSocket manager instance
ws_manager = WebSocketManager()

