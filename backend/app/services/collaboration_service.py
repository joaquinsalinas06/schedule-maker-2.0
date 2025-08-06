import json
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any

from fastapi import HTTPException, status, WebSocketDisconnect
from sqlalchemy.orm import Session, joinedload

from app.models.collaboration import (
    CollaborativeSession, SessionParticipant, ScheduleShare
)
from app.models.schedule import Schedule, ScheduleSession
from app.models.session import Session as SessionModel
from app.models.section import Section
from app.repositories.collaborative_session_repository import CollaborativeSessionRepository
from app.repositories.session_participant_repository import SessionParticipantRepository
from app.repositories.schedule_share_repository import ScheduleShareRepository
from app.repositories.user_repository import UserRepository
from app.repositories.schedule_repository import ScheduleRepository
from app.schemas import ScheduleShareCreate

class CollaborationService:
    def __init__(self, db: Session):
        self.db = db
        self.session_repo = CollaborativeSessionRepository(db)
        self.participant_repo = SessionParticipantRepository(db)
        self.share_repo = ScheduleShareRepository(db)
        self.user_repo = UserRepository(db)
        self.schedule_repo = ScheduleRepository(db)
    
    @staticmethod
    def generate_session_code() -> str:
        """Generate a unique session code"""
        return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
    
    @staticmethod
    def generate_share_token() -> str:
        """Generate a unique 8-character share token"""
        # 36^8 = ~2.8 trillion combinations (A-Z, 0-9)
        return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
    
    def create_collaborative_session(self, session_data, current_user) -> CollaborativeSession:
        """Create a new collaborative session"""
        
        # User can only create sessions for their own university
        # The university_id will be taken from the current_user, not from session_data
        
        # Generate unique session code
        session_code = CollaborationService.generate_session_code()
        while self.session_repo.session_code_exists(session_code):
            session_code = CollaborationService.generate_session_code()
        
        # Create session
        session_data_dict = {
            "name": session_data.name,
            "description": session_data.description,
            "university_id": current_user.university_id,
            "created_by": current_user.id,
            "session_code": session_code,
            "max_participants": session_data.max_participants,
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=session_data.duration_hours)
        }
        
        session = self.session_repo.create(session_data_dict)
        
        # Add creator as participant
        participant_data = {
            "session_id": session.id,
            "user_id": current_user.id,
            "role": 'creator'
        }
        self.participant_repo.create(participant_data)
        
        return session
    
    def join_session(self, join_data, current_user) -> SessionParticipant:
        """Join a collaborative session"""
        
        # Get session
        session = self.session_repo.get_active_session_by_code(join_data.session_code)
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or expired"
            )
        
        # Verify user belongs to same university
        if current_user.university_id != session.university_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User must belong to the same university"
            )
        
        # Check if already a participant
        existing = self.participant_repo.get_by_session_and_user(
            session.id,
            current_user.id
        )
        
        if existing:
            return existing
        
        # Check participant limit
        active_count = self.participant_repo.count_session_participants(session.id)
        
        if active_count >= session.max_participants:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Session is full"
            )
        
        # Add participant
        participant_data = {
            "session_id": session.id,
            "user_id": current_user.id,
            "role": 'participant'
        }
        participant = self.participant_repo.create(participant_data)
        
        return participant
    
    def get_session_details(self, session_code: str, user_id: int) -> Dict[str, Any]:
        """Get collaborative session details"""
        
        session = self.session_repo.get_by_session_code(session_code)
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check if user is participant
        participant = self.participant_repo.get_by_session_and_user(
            session.id,
            user_id
        )
        
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a participant in this session"
            )
        
        # Get all participants with user details
        participants = self.participant_repo.get_session_participants_with_users(
            session.id
        )
        
        participant_data = []
        for p in participants:
            participant_data.append({
                "user_id": p.user_id,
                "name": f"{p.user.first_name} {p.user.last_name}",
                "email": p.user.email,
                "role": p.role,
                "joined_at": p.joined_at.isoformat() if p.joined_at else None
            })
        
        return {
            "id": session.id,
            "name": session.name,
            "description": session.description,
            "session_code": session.session_code,
            "university_id": session.university_id,
            "created_by": session.created_by,
            "is_active": session.is_active,
            "max_participants": session.max_participants,
            "current_schedule_data": session.current_schedule_data,
            "expires_at": session.expires_at.isoformat() if session.expires_at else None,
            "participants": participant_data
        }
    
    async def share_schedule_from_request(self, request, current_user) -> ScheduleShare:
        """Handle schedule sharing with request parsing"""
        
        try:
            body = await request.body()
            body_str = body.decode('utf-8')
            content_type = request.headers.get('content-type', '')
            
            # Parse the request data
            if 'application/json' in content_type:
                json_data = json.loads(body_str)
            else:
                from urllib.parse import parse_qs
                parsed_data = parse_qs(body_str)
                json_data = {key: values[0] if values else None for key, values in parsed_data.items()}
            
            # Try to create the model
            share_data = ScheduleShareCreate(**json_data)
            
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Invalid share request: {e}")
        
        return self.share_schedule(share_data, current_user)

    def share_schedule(self, share_data, current_user) -> ScheduleShare:
        """Share a schedule publicly as view-only"""
        
        # Verify schedule ownership
        schedule = self.schedule_repo.get_by_id_and_user(
            share_data.schedule_id,
            current_user.id
        )
        
        if not schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found"
            )
        
        # Generate share token
        share_token = CollaborationService.generate_share_token()
        
        # Simplified: always public, view-only, no expiration
        share_data_dict = {
            "schedule_id": share_data.schedule_id,
            "shared_by": current_user.id,
            "share_token": share_token,
            "permissions": "view",  # Always view-only
            "is_active": True
        }
        
        share = self.share_repo.create(share_data_dict)
        
        return share
    
    def get_shared_schedule(self, share_token: str, user_id: int) -> Dict[str, Any]:
        """Access a shared schedule"""
        
        share = self.share_repo.get_by_token(
            share_token,
            active_only=True,
            non_expired_only=True
        )
        
        if not share:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shared schedule not found or expired"
            )
        
        # Check permissions
        if share.shared_with and share.shared_with != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this schedule"
            )
        
        # Get schedule with details
        schedule = self.schedule_repo.get(share.schedule_id)
        
        return {
            "schedule": schedule,
            "share": share,
            "permissions": share.permissions
        }
    


    def get_shared_schedule_with_details(self, share_token: str, user_id: int) -> Dict[str, Any]:
        """Get shared schedule with complete details including courses and sharer info"""
        result = self.get_shared_schedule(share_token, user_id)
        
        # Get the sharer user info
        sharer = self.user_repo.get(result["share"].shared_by)
        
        # Get schedule with all related data loaded
        schedule_id = result["schedule"].id
        schedule = self.db.query(Schedule).filter(Schedule.id == schedule_id).options(
            joinedload(Schedule.schedule_sessions).joinedload(ScheduleSession.session),
            joinedload(Schedule.schedule_sessions).joinedload(ScheduleSession.section).joinedload(Section.course)
        ).first()
        
        if not schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found"
            )
        
        # Build the combination data structure expected by frontend
        courses = []
        sections_processed = set()
        
        if schedule.schedule_sessions:
            for schedule_session in schedule.schedule_sessions:
                if schedule_session.section_id in sections_processed:
                    continue
                    
                sections_processed.add(schedule_session.section_id)
                
                section = schedule_session.section
                if section and section.course:
                    # Get all sessions for this section
                    section_sessions = self.db.query(SessionModel).filter(SessionModel.section_id == section.id).all()
                    session_data = []
                    for sess in section_sessions:
                        # Convert day name to numeric index for frontend
                        # The CSV import stores days as English day names (Monday, Tuesday, etc.)
                        day_mapping = {
                            # English day names (what's actually stored in DB)
                            'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0,
                            # Spanish day names and abbreviations (backup)
                            'Dom': 0, 'Dom.': 0, 'Domingo': 0,
                            'Lun': 1, 'Lun.': 1, 'Lunes': 1,
                            'Mar': 2, 'Mar.': 2, 'Martes': 2,
                            'Mie': 3, 'Mie.': 3, 'Mié': 3, 'Mié.': 3, 'Miércoles': 3,
                            'Jue': 4, 'Jue.': 4, 'Jueves': 4,
                            'Vie': 5, 'Vie.': 5, 'Viernes': 5,
                            'Sab': 6, 'Sab.': 6, 'Sábado': 6
                        }
                        
                        day_index = day_mapping.get(sess.day, 0)  # Default to Sunday if not found
                        
                        session_data.append({
                            "day_of_week": day_index,
                            "start_time": str(sess.start_time) if sess.start_time else None,
                            "end_time": str(sess.end_time) if sess.end_time else None,
                            "classroom": sess.location or sess.room or "TBA"  # Our model uses 'location' and 'room'
                        })
                    
                    courses.append({
                        "course_code": section.course.code,
                        "course_name": section.course.name,
                        "section_number": section.section_number,
                        "professor": section.professor,
                        "sessions": session_data
                    })
        
        combination_data = {
            "courses": courses
        }
        
        return {
            "schedule": {
                "id": schedule.id,
                "name": schedule.name,
                "description": schedule.description,
                "combination": combination_data,
            },
            "permissions": result["permissions"],
            "shared_by": {
                "id": sharer.id if sharer else None,
                "name": f"{sharer.first_name} {sharer.last_name}" if sharer else "Unknown User"
            }
        }


    def revoke_schedule_share(self, share_id: int, user_id: int) -> None:
        """Revoke a schedule share"""
        share = self.share_repo.get(share_id)
        
        if not share:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule share not found"
            )
        
        # Verify ownership
        if share.shared_by != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only revoke your own shared schedules"
            )
        
        # Soft delete the share
        self.share_repo.update(share, {"is_active": False})
    
    def handle_schedule_update(self, session_code: str, schedule_data: Dict[str, Any]) -> None:
        """Handle schedule update for collaborative session"""
        session = self.session_repo.get_by_session_code(session_code)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collaborative session not found"
            )
        
        # Update session's current schedule data
        self.session_repo.update(session, {"current_schedule_data": schedule_data})
    
    def validate_session_access(self, session_code: str, user_id: int) -> CollaborativeSession:
        """Validate that user has access to the session"""
        session = self.session_repo.get_by_session_code(session_code)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collaborative session not found"
            )
        
        # Check if user is a participant
        participant = self.participant_repo.get_by_session_and_user(session.id, user_id)
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a participant in this session"
            )
        
        return session
    
    async def handle_websocket_connection(self, session_code: str, user_id: int) -> Dict[str, Any]:
        """Handle WebSocket connection setup for collaborative session"""
        # Validate session access
        session = self.validate_session_access(session_code, user_id)
        
        # Get session details for initial state
        session_details = self.get_session_details(session_code, user_id)
        
        return {
            "session": session,
            "session_details": session_details
        }
    
    async def handle_websocket_message(self, message: dict, session_code: str, user_id: int) -> Dict[str, Any]:
        """Process WebSocket message and return response data"""
        message_type = message.get("type")
        data = message.get("data", {})
        
        if message_type == "schedule_update":
            self.handle_schedule_update(session_code, data)
            return {
                "type": "schedule_update_broadcast",
                "data": data,
                "exclude_user": user_id
            }
            
        elif message_type == "add_course":
            course_data = data.get("course")
            if course_data:
                return {
                    "type": "course_addition_broadcast",
                    "data": course_data,
                    "exclude_user": user_id
                }
                
        elif message_type == "remove_course":
            course_id = data.get("course_id")
            if course_id:
                return {
                    "type": "course_removal_broadcast", 
                    "data": {"course_id": course_id},
                    "exclude_user": user_id
                }
                
        elif message_type == "cursor_position":
            return {
                "type": "cursor_update_broadcast",
                "data": {
                    "user_id": user_id,
                    "position": data.get("position"),
                    "timestamp": message.get("timestamp")
                },
                "exclude_user": user_id
            }
            
        elif message_type == "typing_indicator":
            return {
                "type": "typing_status_broadcast",
                "data": {
                    "user_id": user_id,
                    "is_typing": data.get("is_typing", False),
                    "timestamp": message.get("timestamp")
                },
                "exclude_user": user_id
            }
        
        return None
    
    async def handle_comparison_connection(self, session_code: str, user_id: int) -> Dict[str, Any]:
        """Handle WebSocket connection setup for schedule comparison"""
        # Get session details for comparison
        session_details = self.get_session_details(session_code, user_id)
        
        return {
            "session_details": session_details
        }
    
    async def handle_comparison_message(self, message: dict, session_code: str) -> Dict[str, Any]:  # noqa: ARG002
        """Process comparison WebSocket message"""
        if message.get("type") == "comparison_update":
            return {
                "type": "comparison_update_broadcast",
                "data": message.get("data", {})
            }
        
        return None
    
    async def handle_websocket_session(self, websocket, session_code: str, token: str, manager, get_current_user_websocket_func) -> None:
        """Complete WebSocket session handler for collaborative scheduling"""
        
        user = None
        try:
            # Authenticate user
            user = await get_current_user_websocket_func(token, self.db)
            if not user:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
                
            # Setup connection
            connection_data = await self.handle_websocket_connection(session_code, user.id)
            
            # Connect to WebSocket manager
            await manager.connect(websocket, session_code, user.id)
            
            # Send initial session state
            await manager.send_personal_message(
                json.dumps({
                    "type": "session_state",
                    "data": connection_data["session_details"]
                }),
                user.id
            )
            
            # Listen for messages
            while True:
                try:
                    data = await websocket.receive_text()
                    message = json.loads(data)
                    
                    # Process message using service
                    response = await self.handle_websocket_message(message, session_code, user.id)
                    if response:
                        await self._broadcast_message(response, session_code, manager)
                    
                except WebSocketDisconnect:
                    break
                except json.JSONDecodeError:
                    continue
                    
        except WebSocketDisconnect:
            pass
        finally:
            if user:
                await manager.disconnect(user.id)
    
    async def handle_comparison_session(self, websocket, session_code: str, token: str, manager, get_current_user_websocket_func) -> None:
        """Complete WebSocket session handler for schedule comparison"""
        
        user = None
        try:
            # Authenticate user
            user = await get_current_user_websocket_func(token, self.db)
            if not user:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
                
            # Setup connection
            connection_data = await self.handle_comparison_connection(session_code, user.id)
            
            # Connect to manager
            await manager.connect(websocket, f"compare_{session_code}", user.id)
            
            # Send current comparison state
            await manager.send_personal_message(
                json.dumps({
                    "type": "comparison_state", 
                    "data": connection_data["session_details"]
                }),
                user.id
            )
            
            # Listen for comparison updates
            while True:
                try:
                    data = await websocket.receive_text()
                    message = json.loads(data)
                    
                    # Process message using service
                    response = await self.handle_comparison_message(message, f"compare_{session_code}")
                    if response:
                        await self._broadcast_message(response, f"compare_{session_code}", manager)
                        
                except WebSocketDisconnect:
                    break
                except json.JSONDecodeError:
                    continue
                    
        except WebSocketDisconnect:
            pass
        finally:
            if user:
                await manager.disconnect(user.id)
    
    async def _broadcast_message(self, response: dict, session_code: str, manager) -> None:
        """Internal method to broadcast message to WebSocket manager based on response type"""
        message_type = response.get("type")
        data = response.get("data")
        exclude_user = response.get("exclude_user")
        
        if message_type == "schedule_update_broadcast":
            await manager.send_schedule_update(session_code, data, exclude_user)
        elif message_type == "course_addition_broadcast":
            await manager.send_course_addition(session_code, data, exclude_user)
        elif message_type == "course_removal_broadcast":
            await manager.send_course_removal(session_code, data["course_id"], exclude_user)
        elif message_type in ["cursor_update_broadcast", "typing_status_broadcast"]:
            await manager.broadcast_to_session(session_code, {
                "type": message_type.replace("_broadcast", ""),
                **data
            }, exclude_user=exclude_user)
        elif message_type == "comparison_update_broadcast":
            await manager.send_comparison_update(session_code, data)
