from fastapi import WebSocket
from typing import List, Dict, Any
import json
import asyncio


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)

    async def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

    async def send_personal_message(self, message: Dict[Any, Any], websocket: WebSocket):
        """Send a message to a specific connection"""
        try:
            await websocket.send_json(message)
        except Exception:
            await self.disconnect(websocket)

    async def broadcast(self, message: Dict[Any, Any]):
        """Broadcast a message to all connected clients"""
        async with self._lock:
            disconnected = []
            for connection in self.active_connections:
                try:
                    await connection.send_json(message)
                except Exception:
                    disconnected.append(connection)
            
            # Clean up disconnected clients
            for conn in disconnected:
                self.active_connections.remove(conn)

    async def broadcast_to_role(self, message: Dict[Any, Any], role: str):
        """Broadcast a message to connections with a specific role"""
        # This would require storing role info with connections
        # For now, just broadcast to all
        await self.broadcast(message)

    @property
    def connection_count(self) -> int:
        """Return the number of active connections"""
        return len(self.active_connections)


# Global connection manager instance
manager = ConnectionManager()