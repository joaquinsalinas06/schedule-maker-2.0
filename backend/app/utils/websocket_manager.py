import json
from datetime import datetime
from typing import Dict, List, Any

from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Active connections: session_code -> {user_id: websocket}
        self.active_connections: Dict[str, Dict[int, WebSocket]] = {}
        # User to session mapping: user_id -> session_code
        self.user_sessions: Dict[int, str] = {}
        # Connection metadata: user_id -> {last_ping: datetime, connection_time: datetime}
        self.connection_metadata: Dict[int, Dict[str, Any]] = {}
        # Message queue for ordered delivery: session_code -> List[message]
        self.message_queues: Dict[str, List[Dict[str, Any]]] = {}
        
    async def connect(self, websocket: WebSocket, session_code: str, user_id: int):
        """Connect a user to a collaborative session"""
        await websocket.accept()
        
        if session_code not in self.active_connections:
            self.active_connections[session_code] = {}
            self.message_queues[session_code] = []
            
        # Clean up any existing connection for this user
        if user_id in self.user_sessions:
            await self.disconnect(user_id)
            
        self.active_connections[session_code][user_id] = websocket
        self.user_sessions[user_id] = session_code
        self.connection_metadata[user_id] = {
            "last_ping": datetime.utcnow(),
            "connection_time": datetime.utcnow(),
            "message_count": 0
        }
        
        print(f"[WebSocket Manager] User {user_id} connected to session {session_code}")
        
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
            
            print(f"[WebSocket Manager] Disconnecting user {user_id} from session {session_code}")
            
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
                    if session_code in self.message_queues:
                        del self.message_queues[session_code]
                    print(f"[WebSocket Manager] Cleaned up empty session {session_code}")
                    
            del self.user_sessions[user_id]
            
        # Clean up metadata
        if user_id in self.connection_metadata:
            del self.connection_metadata[user_id]
            
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
            
            print(f"[WebSocket Manager] Broadcasting to session {session_code}: {message.get('type', 'unknown') if isinstance(message, dict) else 'unknown'}")
            
            disconnected_users = []
            for user_id, websocket in self.active_connections[session_code].items():
                if exclude_user and user_id == exclude_user:
                    continue
                    
                try:
                    print(f"[WebSocket Manager] Sending to user {user_id}")
                    await websocket.send_text(message_str)
                except Exception as e:
                    print(f"[WebSocket Manager] Failed to send to user {user_id}: {e}")
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

    async def validate_user_session(self, user_id: int, session_code: str) -> bool:
        """Validate user still has access to session"""
        if user_id not in self.user_sessions:
            return False
        return self.user_sessions[user_id] == session_code

    async def ping_connections(self, session_code: str):
        """Send ping to all connections to check health"""
        if session_code not in self.active_connections:
            return
            
        ping_message = {
            "type": "ping",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        disconnected_users = []
        for user_id, websocket in self.active_connections[session_code].items():
            try:
                await websocket.send_text(json.dumps(ping_message))
                # Update last ping time
                if user_id in self.connection_metadata:
                    self.connection_metadata[user_id]["last_ping"] = datetime.utcnow()
            except Exception as e:
                print(f"[WebSocket Manager] Ping failed for user {user_id}: {e}")
                disconnected_users.append(user_id)
        
        # Clean up failed connections
        for user_id in disconnected_users:
            await self.disconnect(user_id)

    async def cleanup_stale_connections(self):
        """Remove disconnected users and empty sessions"""
        stale_users = []
        now = datetime.utcnow()
        
        for user_id, metadata in self.connection_metadata.items():
            # Mark as stale if no ping response in 60 seconds
            if (now - metadata.get("last_ping", now)).total_seconds() > 60:
                stale_users.append(user_id)
        
        for user_id in stale_users:
            print(f"[WebSocket Manager] Cleaning up stale connection for user {user_id}")
            await self.disconnect(user_id)

    async def queue_message(self, session_code: str, message: dict):
        """Queue message for ordered delivery"""
        if session_code not in self.message_queues:
            self.message_queues[session_code] = []
        
        message["sequence"] = len(self.message_queues[session_code])
        message["queued_at"] = datetime.utcnow().isoformat()
        self.message_queues[session_code].append(message)
        
        # Process queue immediately
        await self.process_message_queue(session_code)

    async def process_message_queue(self, session_code: str):
        """Process queued messages in order"""
        if session_code not in self.message_queues:
            return
            
        queue = self.message_queues[session_code]
        if not queue:
            return
            
        # Sort by sequence to ensure order
        queue.sort(key=lambda x: x.get("sequence", 0))
        
        for message in queue[:]:  # Process copy of queue
            try:
                await self.broadcast_to_session(session_code, message)
                queue.remove(message)
            except Exception as e:
                print(f"[WebSocket Manager] Failed to process queued message: {e}")
                break  # Stop processing on first failure

# Global connection manager instance
manager = ConnectionManager()
