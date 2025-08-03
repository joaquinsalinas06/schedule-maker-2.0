from fastapi import APIRouter, WebSocket, Depends, Query
from app.utils.websocket_manager import manager
from app.utils.dependencies import get_current_user_websocket, get_collaboration_service
from app.services.collaboration_service import CollaborationService

router = APIRouter(prefix="/ws", tags=["websocket"])

@router.websocket("/collaborate/{session_code}")
async def websocket_collaborate(
    websocket: WebSocket,
    session_code: str,
    token: str = Query(...),
    collaboration_service: CollaborationService = Depends(get_collaboration_service)
):
    """WebSocket endpoint for collaborative schedule creation"""
    await collaboration_service.handle_websocket_session(
        websocket, session_code, token, manager, get_current_user_websocket
    )

@router.websocket("/compare/{session_code}")
async def websocket_compare(
    websocket: WebSocket,
    session_code: str,
    token: str = Query(...),
    collaboration_service: CollaborationService = Depends(get_collaboration_service)
):
    """WebSocket endpoint for schedule comparison"""
    await collaboration_service.handle_comparison_session(
        websocket, session_code, token, manager, get_current_user_websocket
    )
