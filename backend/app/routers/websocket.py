from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, status
from fastapi.exceptions import WebSocketException
from sqlalchemy.orm import Session
import json
from typing import Optional

from app.database.connection import get_db
from app.utils.websocket_manager import manager
from app.utils.dependencies import get_current_user_websocket
from app.services.collaboration_service import CollaborationService
from app.models.user import User
from app.models.collaboration import CollaborativeSession
import logging

router = APIRouter(prefix="/ws", tags=["websocket"])
logger = logging.getLogger(__name__)

@router.websocket("/collaborate/{session_code}")
async def websocket_collaborate(
    websocket: WebSocket,
    session_code: str,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for collaborative schedule creation"""
    
    try:
        # Authenticate user from token
        user = await get_current_user_websocket(token, db)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        # Verify session exists and user can join
        try:
            participant = CollaborationService.join_session(db, session_code, user.id)
        except Exception as e:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        # Connect to WebSocket manager
        await manager.connect(websocket, session_code, user.id)
        
        # Send initial session state
        session_details = CollaborationService.get_session_details(db, session_code, user.id)
        await manager.send_personal_message(
            json.dumps({
                "type": "session_state",
                "data": session_details
            }),
            user.id
        )
        
        # Listen for messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                await handle_websocket_message(message, session_code, user.id, db)
                
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON received from user {user.id}")
                continue
            except Exception as e:
                logger.error(f"Error handling WebSocket message: {str(e)}")
                continue
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket connection error: {str(e)}")
    finally:
        await manager.disconnect(user.id)

async def handle_websocket_message(message: dict, session_code: str, user_id: int, db: Session):
    """Handle different types of WebSocket messages"""
    
    message_type = message.get("type")
    data = message.get("data", {})
    
    if message_type == "schedule_update":
        # Update collaborative schedule
        session = db.query(CollaborativeSession).filter(
            CollaborativeSession.session_code == session_code
        ).first()
        
        if session:
            session.current_schedule_data = data
            db.commit()
            
            # Broadcast update to other participants
            await manager.send_schedule_update(session_code, data, user_id)
            
    elif message_type == "add_course":
        # Add course to collaborative schedule
        course_data = data.get("course")
        if course_data:
            await manager.send_course_addition(session_code, course_data, user_id)
            
    elif message_type == "remove_course":
        # Remove course from collaborative schedule
        course_id = data.get("course_id")
        if course_id:
            await manager.send_course_removal(session_code, course_id, user_id)
            
    elif message_type == "cursor_position":
        # Share cursor/selection position
        await manager.broadcast_to_session(
            session_code,
            {
                "type": "cursor_update",
                "user_id": user_id,
                "position": data.get("position"),
                "timestamp": message.get("timestamp")
            },
            exclude_user=user_id
        )
        
    elif message_type == "typing_indicator":
        # Share typing status
        await manager.broadcast_to_session(
            session_code,
            {
                "type": "typing_status",
                "user_id": user_id,
                "is_typing": data.get("is_typing", False),
                "timestamp": message.get("timestamp")
            },
            exclude_user=user_id
        )

@router.websocket("/compare/{session_code}")
async def websocket_compare(
    websocket: WebSocket,
    session_code: str,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for schedule comparison"""
    
    try:
        # Authenticate user
        user = await get_current_user_websocket(token, db)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        # Verify session access
        try:
            session_details = CollaborationService.get_session_details(db, session_code, user.id)
        except Exception as e:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        # Connect to manager
        await manager.connect(websocket, f"compare_{session_code}", user.id)
        
        # Send current comparison state
        await manager.send_personal_message(
            json.dumps({
                "type": "comparison_state", 
                "data": session_details
            }),
            user.id
        )
        
        # Listen for comparison updates
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                if message.get("type") == "comparison_update":
                    await manager.send_comparison_update(
                        f"compare_{session_code}", 
                        message.get("data", {})
                    )
                    
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Comparison WebSocket error: {str(e)}")
                continue
                
    except Exception as e:
        logger.error(f"Comparison WebSocket connection error: {str(e)}")
    finally:
        await manager.disconnect(user.id)
