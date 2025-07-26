import json
import uuid
from typing import Dict, List, Any
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.models.collaboration import CollaborativeSession, SessionParticipant
from app.models.user import User
import asyncio
from datetime import datetime

class ConnectionManager:
    def __init__(self):
        # Active connections: session_code -> {user_id: websocket}
        self.active_connections: Dict[str, Dict[int, WebSocket]] = {}
        # User to session mapping: user_id -> session_code
        self.user_sessions: Dict[int, str] = {}
        
    async def connect(self, websocket: WebSocket, session_code: str, user_id: int):
        """Connect a user to a collaborative session"""
        await websocket.accept()
        
        if session_code not in self.active_connections:
            self.active_connections[session_code] = {}
            
        self.active_connections[session_code][user_id] = websocket
        self.user_sessions[user_id] = session_code
        
        # Notify other participants that user joined
        await self.broadcast_to_session(
            session_code, 
            {
                "type": "user_joined",
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat()
            },
            exclude_user=user_id
        )
        
    async def disconnect(self, user_id: int):
        """Disconnect a user from their session"""
        if user_id in self.user_sessions:
            session_code = self.user_sessions[user_id]
            
            if session_code in self.active_connections:
                if user_id in self.active_connections[session_code]:
                    del self.active_connections[session_code][user_id]
                    
                # Notify other participants that user left
                await self.broadcast_to_session(
                    session_code,
                    {
                        "type": "user_left", 
                        "user_id": user_id,
                        "timestamp": datetime.utcnow().isoformat()
                    },
                    exclude_user=user_id
                )
                
                # Clean up empty sessions
                if not self.active_connections[session_code]:
                    del self.active_connections[session_code]
                    
            del self.user_sessions[user_id]
            
    async def send_personal_message(self, message: str, user_id: int):
        """Send a message to a specific user"""
        if user_id in self.user_sessions:
            session_code = self.user_sessions[user_id]
            if (session_code in self.active_connections and 
                user_id in self.active_connections[session_code]):
                websocket = self.active_connections[session_code][user_id]
                await websocket.send_text(message)
                
    async def broadcast_to_session(self, session_code: str, message: Any, exclude_user: int = None):
        """Broadcast a message to all users in a session"""
        if session_code in self.active_connections:
            message_str = json.dumps(message) if isinstance(message, dict) else message
            
            disconnected_users = []
            for user_id, websocket in self.active_connections[session_code].items():
                if exclude_user and user_id == exclude_user:
                    continue
                    
                try:
                    await websocket.send_text(message_str)
                except Exception:
                    # Mark for removal
                    disconnected_users.append(user_id)
                    
            # Remove disconnected users
            for user_id in disconnected_users:
                await self.disconnect(user_id)
                
    async def get_session_participants(self, session_code: str) -> List[int]:
        """Get list of active participants in a session"""
        if session_code in self.active_connections:
            return list(self.active_connections[session_code].keys())
        return []
        
    async def send_schedule_update(self, session_code: str, schedule_data: dict, updated_by: int):
        """Send schedule update to all participants"""
        message = {
            "type": "schedule_update",
            "data": schedule_data,
            "updated_by": updated_by,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast_to_session(session_code, message, exclude_user=updated_by)
        
    async def send_course_addition(self, session_code: str, course_data: dict, added_by: int):
        """Send course addition notification"""
        message = {
            "type": "course_added",
            "data": course_data,
            "added_by": added_by,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast_to_session(session_code, message, exclude_user=added_by)
        
    async def send_course_removal(self, session_code: str, course_id: int, removed_by: int):
        """Send course removal notification"""
        message = {
            "type": "course_removed", 
            "course_id": course_id,
            "removed_by": removed_by,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast_to_session(session_code, message, exclude_user=removed_by)
        
    async def send_comparison_update(self, session_code: str, comparison_data: dict):
        """Send schedule comparison update"""
        message = {
            "type": "comparison_update",
            "data": comparison_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast_to_session(session_code, message)

# Global connection manager instance
manager = ConnectionManager()
