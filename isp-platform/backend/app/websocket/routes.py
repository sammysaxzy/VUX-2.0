from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import asyncio

from ..core.security import decode_access_token
from .manager import manager

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint for real-time updates"""
    user_id = None
    connected = False
    
    try:
        await manager.connect(websocket)
        connected = True

        # Wait for authentication message
        auth_message = await asyncio.wait_for(
            websocket.receive_text(),
            timeout=30.0
        )
        auth_data = json.loads(auth_message)
        
        if auth_data.get("type") == "auth":
            token = auth_data.get("token")
            payload = decode_access_token(token)
            
            if payload:
                user_id = payload.get("user_id")
                
                # Send connection confirmation
                await websocket.send_text(json.dumps({
                    "type": "connected",
                    "message": "Successfully connected to WebSocket",
                    "user_id": user_id
                }))
            else:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid authentication token"
                }))
                await websocket.close()
                return
        else:
            await websocket.close()
            return
        
        # Main message loop
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            await handle_websocket_message(websocket, message, user_id)
            
    except WebSocketDisconnect:
        if connected:
            await manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        if connected:
            await manager.disconnect(websocket)


async def handle_websocket_message(websocket: WebSocket, message: dict, user_id: int):
    """Handle incoming WebSocket messages"""
    message_type = message.get("type")
    
    if message_type == "ping":
        await websocket.send_text(json.dumps({"type": "pong"}))
    
    elif message_type == "subscribe":
        # Subscribe to specific channels
        channels = message.get("channels", [])
        # Store subscription preferences (simplified)
        await websocket.send_text(json.dumps({
            "type": "subscribed",
            "channels": channels
        }))
    
    elif message_type == "unsubscribe":
        # Unsubscribe from channels
        channels = message.get("channels", [])
        await websocket.send_text(json.dumps({
            "type": "unsubscribed",
            "channels": channels
        }))

# Backward-compatible export expected by app.main
websocket_router = router
