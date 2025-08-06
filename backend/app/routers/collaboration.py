from fastapi import APIRouter, Depends, Request, HTTPException
from typing import List
from sqlalchemy.orm import Session
from datetime import datetime

from app.utils.dependencies import get_current_user, get_collaboration_service, get_db
from app.models.user import User
from app.models.collaboration import CollaborativeCourseSelection, GeneratedCollaborativeSchedule
from app.schemas import (
    CollaborativeSessionCreate, CollaborativeSessionResponse,
    JoinSessionRequest, ScheduleShareResponse,
    CollaborativeCourseSelectionCreate, CollaborativeCourseSelectionResponse,
    CollaborativeCourseSelectionUpdate, GenerateSchedulesRequest, GenerateSchedulesResponse
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


# Course Selection Endpoints
@router.get("/sessions/{session_id}/courses", response_model=List[CollaborativeCourseSelectionResponse])
async def get_course_selections(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all course selections for a collaborative session"""
    
    # Verify user is participant in the session
    from app.models.collaboration import SessionParticipant
    participant = db.query(SessionParticipant).filter(
        SessionParticipant.session_id == session_id,
        SessionParticipant.user_id == current_user.id,
        SessionParticipant.is_active == True
    ).first()
    
    if not participant:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")
    
    # Get all course selections for this session
    selections = db.query(CollaborativeCourseSelection).filter(
        CollaborativeCourseSelection.session_id == session_id,
        CollaborativeCourseSelection.is_active == True
    ).all()
    
    return selections

@router.post("/sessions/{session_id}/courses", response_model=CollaborativeCourseSelectionResponse)
async def save_course_selection(
    session_id: int,
    selection_data: CollaborativeCourseSelectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save a course selection to a collaborative session"""
    
    # Verify user is participant in the session
    from app.models.collaboration import SessionParticipant
    participant = db.query(SessionParticipant).filter(
        SessionParticipant.session_id == session_id,
        SessionParticipant.user_id == current_user.id,
        SessionParticipant.is_active == True
    ).first()
    
    if not participant:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")
    
    # Create new course selection
    new_selection = CollaborativeCourseSelection(
        session_id=session_id,
        user_id=current_user.id,
        course_code=selection_data.course_code,
        course_name=selection_data.course_name,
        section_code=selection_data.section_code,
        professor=selection_data.professor,
        schedule_data=selection_data.schedule_data,
        selection_type=selection_data.selection_type,
        shared_with_users=selection_data.shared_with_users,
        priority=selection_data.priority
    )
    
    db.add(new_selection)
    db.commit()
    db.refresh(new_selection)
    
    return new_selection

@router.delete("/sessions/{session_id}/courses/{selection_id}")
async def remove_course_selection(
    session_id: int,
    selection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a course selection from a collaborative session"""
    
    # Verify user is participant in the session
    from app.models.collaboration import SessionParticipant
    participant = db.query(SessionParticipant).filter(
        SessionParticipant.session_id == session_id,
        SessionParticipant.user_id == current_user.id,
        SessionParticipant.is_active == True
    ).first()
    
    if not participant:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")
    
    # Find the course selection
    selection = db.query(CollaborativeCourseSelection).filter(
        CollaborativeCourseSelection.id == selection_id,
        CollaborativeCourseSelection.session_id == session_id,
        CollaborativeCourseSelection.is_active == True
    ).first()
    
    if not selection:
        raise HTTPException(status_code=404, detail="Course selection not found")
    
    # Users can only remove their own selections (unless they're the session creator)
    if selection.user_id != current_user.id and participant.role != 'creator':
        raise HTTPException(status_code=403, detail="Can only remove your own course selections")
    
    # Mark as inactive instead of deleting
    selection.is_active = False
    db.commit()
    
    return {"message": "Course selection removed successfully"}

@router.put("/sessions/{session_id}/courses/{selection_id}", response_model=CollaborativeCourseSelectionResponse)
async def update_course_selection(
    session_id: int,
    selection_id: int,
    update_data: CollaborativeCourseSelectionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a course selection in a collaborative session"""
    
    # Verify user is participant in the session
    from app.models.collaboration import SessionParticipant
    participant = db.query(SessionParticipant).filter(
        SessionParticipant.session_id == session_id,
        SessionParticipant.user_id == current_user.id,
        SessionParticipant.is_active == True
    ).first()
    
    if not participant:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")
    
    # Find the course selection
    selection = db.query(CollaborativeCourseSelection).filter(
        CollaborativeCourseSelection.id == selection_id,
        CollaborativeCourseSelection.session_id == session_id,
        CollaborativeCourseSelection.is_active == True
    ).first()
    
    if not selection:
        raise HTTPException(status_code=404, detail="Course selection not found")
    
    # Users can only update their own selections (unless they're the session creator)
    if selection.user_id != current_user.id and participant.role != 'creator':
        raise HTTPException(status_code=403, detail="Can only update your own course selections")
    
    # Update fields
    if update_data.selection_type is not None:
        selection.selection_type = update_data.selection_type
    if update_data.shared_with_users is not None:
        selection.shared_with_users = update_data.shared_with_users
    if update_data.priority is not None:
        selection.priority = update_data.priority
    if update_data.is_active is not None:
        selection.is_active = update_data.is_active
    
    db.commit()
    db.refresh(selection)
    
    return selection


def detect_schedule_conflicts(course_selections: List[CollaborativeCourseSelection]) -> List[dict]:
    """
    Detect time conflicts between selected courses
    Returns a list of conflict descriptions
    """
    conflicts = []
    
    # Convert course selections to a format we can check for conflicts
    session_times = []
    for selection in course_selections:
        if not selection.schedule_data or not selection.schedule_data.get('sessions'):
            continue
            
        for session in selection.schedule_data['sessions']:
            session_info = {
                'course_code': selection.course_code,
                'course_name': selection.course_name,
                'selection_type': selection.selection_type,
                'day_of_week': session.get('day_of_week'),
                'start_time': session.get('start_time'),
                'end_time': session.get('end_time'),
                'classroom': session.get('classroom'),
                'session_type': session.get('session_type', 'TEORÍA')
            }
            session_times.append(session_info)
    
    # Check for conflicts between sessions
    for i, session1 in enumerate(session_times):
        for j, session2 in enumerate(session_times):
            if i >= j:  # Avoid checking the same pair twice
                continue
                
            # Skip if same course (expected)
            if session1['course_code'] == session2['course_code']:
                continue
            
            # Check if sessions are on the same day
            if session1['day_of_week'] != session2['day_of_week']:
                continue
            
            # Check time overlap
            if _sessions_have_time_conflict(session1, session2):
                conflict = {
                    'type': 'time_conflict',
                    'severity': 'high',
                    'message': f"Time conflict between {session1['course_code']} and {session2['course_code']}",
                    'details': {
                        'course1': {
                            'code': session1['course_code'],
                            'name': session1['course_name'],
                            'day': session1['day_of_week'],
                            'time': f"{session1['start_time']}-{session1['end_time']}",
                            'location': session1['classroom'],
                            'type': session1['selection_type']
                        },
                        'course2': {
                            'code': session2['course_code'],
                            'name': session2['course_name'],
                            'day': session2['day_of_week'],
                            'time': f"{session2['start_time']}-{session2['end_time']}",
                            'location': session2['classroom'],
                            'type': session2['selection_type']
                        }
                    }
                }
                conflicts.append(conflict)
    
    return conflicts


def _sessions_have_time_conflict(session1: dict, session2: dict) -> bool:
    """Check if two sessions have overlapping times"""
    try:
        start1 = _time_string_to_minutes(session1['start_time'])
        end1 = _time_string_to_minutes(session1['end_time'])
        start2 = _time_string_to_minutes(session2['start_time'])
        end2 = _time_string_to_minutes(session2['end_time'])
        
        # Times overlap if one starts before the other ends and vice versa
        return not (end1 <= start2 or end2 <= start1)
    except (ValueError, TypeError, KeyError):
        # If we can't parse the times, assume no conflict
        return False


def _time_string_to_minutes(time_str: str) -> int:
    """Convert time string (HH:MM) to minutes since midnight"""
    if not time_str:
        return 0
    
    try:
        # Handle different time formats
        if isinstance(time_str, str):
            if ':' in time_str:
                hours, minutes = map(int, time_str.split(':'))
            else:
                # Assume it's just hours
                hours = int(time_str)
                minutes = 0
        else:
            return 0
            
        return hours * 60 + minutes
    except (ValueError, AttributeError):
        return 0


# Schedule Generation Endpoint
@router.post("/generate-schedules", response_model=GenerateSchedulesResponse)
async def generate_schedules(
    generation_data: GenerateSchedulesRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate personalized schedules for a collaborative session"""
    
    # Verify user is participant in the session
    from app.models.collaboration import SessionParticipant
    participant = db.query(SessionParticipant).filter(
        SessionParticipant.session_id == generation_data.session_id,
        SessionParticipant.user_id == current_user.id,
        SessionParticipant.is_active == True
    ).first()
    
    if not participant:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")
    
    try:
        # Get all course selections for this session
        all_selections = db.query(CollaborativeCourseSelection).filter(
            CollaborativeCourseSelection.session_id == generation_data.session_id,
            CollaborativeCourseSelection.is_active == True
        ).all()
        
        # Separate shared and individual courses for current user
        shared_selections = [s for s in all_selections if s.selection_type == 'shared']
        individual_selections = [s for s in all_selections if s.selection_type == 'individual' and s.user_id == current_user.id]
        
        # Combine user's shared + individual selections
        user_selections = shared_selections + individual_selections
        
        # Detect conflicts in the user's schedule
        detected_conflicts = detect_schedule_conflicts(user_selections)
        
        # Convert to schedule format (simplified - you may want to integrate with actual schedule generator)
        schedule_data = {
            "user_id": current_user.id,
            "session_id": generation_data.session_id,
            "total_sections": len(user_selections),
            "shared_sections": len(shared_selections),
            "individual_sections": len(individual_selections),
            "sections": [
                {
                    "course_code": sel.course_code,
                    "course_name": sel.course_name,
                    "section_code": sel.section_code,
                    "professor": sel.professor,
                    "selection_type": sel.selection_type,
                    "schedule_data": sel.schedule_data,
                    "added_by": sel.user_id
                }
                for sel in user_selections
            ]
        }
        
        # Save generated schedule to database
        existing_schedule = db.query(GeneratedCollaborativeSchedule).filter(
            GeneratedCollaborativeSchedule.session_id == generation_data.session_id,
            GeneratedCollaborativeSchedule.user_id == current_user.id
        ).first()
        
        # Convert SQLAlchemy objects to serializable dicts
        def selection_to_dict(selection):
            return {
                "id": selection.id,
                "course_code": selection.course_code,
                "course_name": selection.course_name,
                "section_code": selection.section_code,
                "professor": selection.professor,
                "selection_type": selection.selection_type,
                "shared_with_users": selection.shared_with_users,
                "priority": selection.priority,
                "schedule_data": selection.schedule_data,
                "added_at": selection.added_at.isoformat() if selection.added_at else None,
                "is_active": selection.is_active
            }
        
        shared_courses_data = [selection_to_dict(s) for s in shared_selections]
        individual_courses_data = [selection_to_dict(s) for s in individual_selections]
        
        if existing_schedule:
            # Update existing schedule
            existing_schedule.schedule_data = schedule_data
            existing_schedule.shared_courses = shared_courses_data
            existing_schedule.individual_courses = individual_courses_data
            existing_schedule.conflicts = detected_conflicts
            existing_schedule.generation_metadata = {
                "generated_at": datetime.now().isoformat(),
                "algorithm_version": "1.0",
                "total_combinations_evaluated": 1  # Simplified
            }
        else:
            # Create new schedule
            new_schedule = GeneratedCollaborativeSchedule(
                session_id=generation_data.session_id,
                user_id=current_user.id,
                schedule_data=schedule_data,
                shared_courses=shared_courses_data,
                individual_courses=individual_courses_data,
                conflicts=detected_conflicts,
                generation_metadata={
                    "generated_at": datetime.now().isoformat(),
                    "algorithm_version": "1.0",
                    "total_combinations_evaluated": 1  # Simplified
                }
            )
            db.add(new_schedule)
        
        db.commit()
        
        return GenerateSchedulesResponse(
            success=True,
            message=f"Personal schedule generated successfully with {len(user_selections)} sections",
            schedules=[schedule_data],
            conflicts=detected_conflicts
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate schedule: {str(e)}"
        )


