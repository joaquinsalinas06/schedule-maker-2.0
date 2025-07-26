from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.connection import get_db
from app.utils.dependencies import get_current_user
from app.services.collaboration_service import CollaborationService
from app.models.user import User
from app.schemas import (
    CollaborativeSessionCreate, CollaborativeSessionResponse,
    JoinSessionRequest, ScheduleShareCreate, ScheduleShareResponse,
    SharedScheduleAccess, ScheduleComparisonAdd, ScheduleComparisonResponse,
    ScheduleCommentCreate, ScheduleCommentResponse
)

router = APIRouter(prefix="/collaboration", tags=["collaboration"])

# Collaborative Sessions
@router.post("/sessions", response_model=CollaborativeSessionResponse)
async def create_collaborative_session(
    session_data: CollaborativeSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new collaborative session"""
    
    session = CollaborationService.create_collaborative_session(
        db=db,
        name=session_data.name,
        description=session_data.description,
        university_id=current_user.university_id,
        created_by=current_user.id,
        max_participants=session_data.max_participants,
        duration_hours=session_data.duration_hours
    )
    
    return CollaborationService.get_session_details(db, session.session_code, current_user.id)

@router.post("/sessions/join", response_model=CollaborativeSessionResponse)
async def join_collaborative_session(
    join_data: JoinSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Join an existing collaborative session"""
    
    CollaborationService.join_session(db, join_data.session_code, current_user.id)
    return CollaborationService.get_session_details(db, join_data.session_code, current_user.id)

@router.get("/sessions/{session_code}", response_model=CollaborativeSessionResponse)
async def get_session_details(
    session_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get collaborative session details"""
    
    return CollaborationService.get_session_details(db, session_code, current_user.id)

@router.get("/sessions", response_model=List[CollaborativeSessionResponse])
async def get_user_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all sessions user is participating in"""
    
    from app.models.collaboration import SessionParticipant, CollaborativeSession
    from sqlalchemy import and_
    
    # Get sessions where user is a participant
    participant_sessions = db.query(CollaborativeSession).join(SessionParticipant).filter(
        and_(
            SessionParticipant.user_id == current_user.id,
            SessionParticipant.is_active == True,
            CollaborativeSession.is_active == True
        )
    ).all()
    
    sessions = []
    for session in participant_sessions:
        session_details = CollaborationService.get_session_details(
            db, session.session_code, current_user.id
        )
        sessions.append(session_details)
    
    return sessions

# Schedule Sharing
@router.post("/share", response_model=ScheduleShareResponse)
async def share_schedule(
    share_data: ScheduleShareCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Share a schedule with another user or publicly"""
    
    share = CollaborationService.share_schedule(
        db=db,
        schedule_id=share_data.schedule_id,
        shared_by=current_user.id,
        shared_with=share_data.shared_with,
        permissions=share_data.permissions,
        expires_hours=share_data.expires_hours
    )
    
    return share

@router.get("/shared/{share_token}", response_model=SharedScheduleAccess)
async def access_shared_schedule(
    share_token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Access a shared schedule using share token"""
    
    result = CollaborationService.get_shared_schedule(db, share_token, current_user.id)
    
    return {
        "schedule": result["schedule"],
        "permissions": result["permissions"],
        "shared_by": result["share"].sharer
    }

@router.get("/shared", response_model=List[ScheduleShareResponse])
async def get_shared_schedules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all schedules shared by current user"""
    
    from app.models.collaboration import ScheduleShare
    
    shares = db.query(ScheduleShare).filter(
        and_(
            ScheduleShare.shared_by == current_user.id,
            ScheduleShare.is_active == True
        )
    ).all()
    
    return shares

# Schedule Comparison
@router.post("/sessions/{session_id}/compare", response_model=ScheduleComparisonResponse)
async def add_schedule_to_comparison(
    session_id: int,
    comparison_data: ScheduleComparisonAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a schedule to session comparison"""
    
    comparison = CollaborationService.add_schedule_to_comparison(
        db=db,
        session_id=session_id,
        user_id=current_user.id,
        schedule_id=comparison_data.schedule_id
    )
    
    return comparison

@router.get("/sessions/{session_id}/compare", response_model=List[ScheduleComparisonResponse])
async def get_session_comparisons(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all schedules in session comparison"""
    
    from app.models.collaboration import ScheduleComparison, SessionParticipant
    from sqlalchemy import and_
    
    # Verify user is participant
    participant = db.query(SessionParticipant).filter(
        and_(
            SessionParticipant.session_id == session_id,
            SessionParticipant.user_id == current_user.id,
            SessionParticipant.is_active == True
        )
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a participant in this session"
        )
    
    comparisons = db.query(ScheduleComparison).filter(
        ScheduleComparison.session_id == session_id
    ).all()
    
    return comparisons

# Schedule Comments
@router.post("/schedules/{schedule_id}/comments", response_model=ScheduleCommentResponse)
async def add_schedule_comment(
    schedule_id: int,
    comment_data: ScheduleCommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a comment to a schedule"""
    
    from app.models.collaboration import ScheduleComment
    from app.models.schedule import Schedule
    
    # Verify schedule exists and is accessible
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )
    
    # For now, allow comments on any public schedule or own schedules
    # In a more complex system, you might check sharing permissions
    
    comment = ScheduleComment(
        schedule_id=schedule_id,
        user_id=current_user.id,
        comment=comment_data.comment,
        parent_comment_id=comment_data.parent_comment_id
    )
    
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    return comment

@router.get("/schedules/{schedule_id}/comments", response_model=List[ScheduleCommentResponse])
async def get_schedule_comments(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all comments for a schedule"""
    
    from app.models.collaboration import ScheduleComment
    
    comments = db.query(ScheduleComment).filter(
        and_(
            ScheduleComment.schedule_id == schedule_id,
            ScheduleComment.parent_comment_id.is_(None)  # Top-level comments only
        )
    ).order_by(ScheduleComment.created_at.desc()).all()
    
    return comments
