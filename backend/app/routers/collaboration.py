from fastapi import APIRouter, Depends, HTTPException, status, Request
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
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Share a schedule with another user or publicly"""
    
    try:
        body = await request.body()
        body_str = body.decode('utf-8')
        content_type = request.headers.get('content-type', '')
        
        # Parse the request data
        if 'application/json' in content_type:
            import json
            json_data = json.loads(body_str)
        else:
            from urllib.parse import parse_qs
            parsed_data = parse_qs(body_str)
            json_data = {key: values[0] if values else None for key, values in parsed_data.items()}
        
        # Try to create the model
        share_data = ScheduleShareCreate(**json_data)
        
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid share request: {e}")
    
    share = CollaborationService.share_schedule(
        db=db,
        schedule_id=share_data.schedule_id,
        shared_by=current_user.id,
        shared_with=share_data.shared_with,
        permissions=share_data.permissions,
        expires_hours=share_data.expires_hours
    )
    
    return share

@router.get("/shared/{share_token}")
async def access_shared_schedule(
    share_token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Access a shared schedule using share token"""
    
    result = CollaborationService.get_shared_schedule(db, share_token, current_user.id)
    
    # Get the sharer user info
    sharer = db.query(User).filter(User.id == result["share"].shared_by).first()
    
    # Build the combination data structure expected by frontend
    schedule = result["schedule"]
    
    # Get the schedule sessions with course details
    courses = []
    if schedule.schedule_sessions:
        from app.models.session import Session
        from app.models.section import Section  
        from app.models.course import Course
        
        for schedule_session in schedule.schedule_sessions:
            session = db.query(Session).filter(Session.id == schedule_session.session_id).first()
            if session:
                section = db.query(Section).filter(Section.id == session.section_id).first()
                if section:
                    course = db.query(Course).filter(Course.id == section.course_id).first()
                    if course:
                        # Get all sessions for this section
                        section_sessions = db.query(Session).filter(Session.section_id == section.id).all()
                        session_data = []
                        for sess in section_sessions:
                            session_data.append({
                                "day_of_week": sess.day_of_week,
                                "start_time": sess.start_time,
                                "end_time": sess.end_time,
                                "classroom": sess.classroom
                            })
                        
                        courses.append({
                            "course_code": course.code,
                            "course_name": course.name,
                            "section_number": section.section_number,
                            "credits": course.credits,
                            "professor": section.professor,
                            "sessions": session_data
                        })
    
    # Remove duplicates (same course might have multiple sessions)
    unique_courses = []
    seen_sections = set()
    for course in courses:
        section_key = f"{course['course_code']}-{course['section_number']}"
        if section_key not in seen_sections:
            seen_sections.add(section_key)
            unique_courses.append(course)
    
    combination_data = {
        "courses": unique_courses,
        "total_credits": schedule.total_credits or sum(course["credits"] for course in unique_courses)
    }
    
    
    return {
        "schedule": {
            "id": schedule.id,
            "name": schedule.name,
            "description": schedule.description,
            "combination": combination_data,
            "total_credits": schedule.total_credits
        },
        "permissions": result["permissions"],
        "shared_by": {
            "id": sharer.id if sharer else None,
            "name": f"{sharer.first_name} {sharer.last_name}" if sharer else "Unknown User"
        }
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
