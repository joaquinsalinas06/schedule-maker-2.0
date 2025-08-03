from fastapi import APIRouter, Depends, Request
from typing import List

from app.utils.dependencies import get_current_user, get_collaboration_service
from app.models.user import User
from app.schemas import (
    CollaborativeSessionCreate, CollaborativeSessionResponse,
    JoinSessionRequest, ScheduleShareResponse
)

router = APIRouter(prefix="/collaboration", tags=["collaboration"])

# Collaborative Sessions
@router.post("/sessions", response_model=CollaborativeSessionResponse)
async def create_collaborative_session(
    session_data: CollaborativeSessionCreate,
    current_user: User = Depends(get_current_user),
    collaboration_service = Depends(get_collaboration_service)
):
    """Create a new collaborative session"""
    
    session = collaboration_service.create_collaborative_session(session_data, current_user)
    
    return collaboration_service.get_session_details(session.session_code, current_user.id)

@router.post("/sessions/join", response_model=CollaborativeSessionResponse)
async def join_collaborative_session(
    join_data: JoinSessionRequest,
    current_user: User = Depends(get_current_user),
    collaboration_service = Depends(get_collaboration_service)
):
    """Join an existing collaborative session"""
    
    collaboration_service.join_session(join_data, current_user)
    return collaboration_service.get_session_details(join_data.session_code, current_user.id)


# Schedule Sharing
@router.post("/share", response_model=ScheduleShareResponse)
async def share_schedule(
    request: Request,
    current_user: User = Depends(get_current_user),
    collaboration_service = Depends(get_collaboration_service)
):
    """Share a schedule with another user or publicly"""
    return await collaboration_service.share_schedule_from_request(request, current_user)

@router.get("/shared/{share_token}")
async def access_shared_schedule(
    share_token: str,
    current_user: User = Depends(get_current_user),
    collaboration_service = Depends(get_collaboration_service)
):
    """Access a shared schedule using share token"""
    return collaboration_service.get_shared_schedule_with_details(share_token, current_user.id)

@router.delete("/shared/{share_id}")
async def revoke_schedule_share(
    share_id: int,
    current_user: User = Depends(get_current_user),
    collaboration_service = Depends(get_collaboration_service)
):
    """Revoke a schedule share"""
    collaboration_service.revoke_schedule_share(share_id, current_user.id)
    return {"message": "Schedule share revoked successfully"}


