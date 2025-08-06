from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas import APIResponse, FriendRequestCreate
from app.utils.dependencies import get_current_active_user, get_friend_service, get_db


router = APIRouter(prefix="/api/friends", tags=["friends"])


def get_friend_service_dep():
    """Dependency to get friend service"""
    from app.services.friend_service import FriendService
    from app.utils.dependencies import get_db
    return FriendService(next(get_db()))


@router.get("/search")
async def search_users(
    query: str = Query(..., min_length=2, description="Search query (minimum 2 characters)"),
    current_user: User = Depends(get_current_active_user)
):
    """Search for users to add as friends"""
    friend_service = get_friend_service_dep()
    
    users = friend_service.search_users(
        query=query,
        current_user_id=current_user.id,
        university_id=current_user.university_id
    )
    
    return {
        "data": users,
        "message": f"Encontrados {len(users)} usuarios"
    }


@router.post("/request")
async def send_friend_request(
    request_data: FriendRequestCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Send a friend request"""
    friend_service = get_friend_service_dep()
    
    request = friend_service.send_friend_request(
        sender_id=current_user.id,
        receiver_id=request_data.receiver_id,
        message=request_data.message
    )
    
    return {
        "data": {
            "request_id": request.id,
            "receiver_id": request_data.receiver_id,
            "message": "Solicitud enviada exitosamente"
        },
        "message": "Solicitud de amistad enviada"
    }


@router.post("/request/{request_id}/accept")
async def accept_friend_request(
    request_id: int,
    current_user: User = Depends(get_current_active_user)
):
    """Accept a friend request"""
    friend_service = get_friend_service_dep()
    
    request = friend_service.accept_friend_request(request_id, current_user.id)
    
    return {
        "data": {
            "request_id": request.id,
            "status": "accepted"
        },
        "message": "Solicitud aceptada. ¡Ahora son amigos!"
    }


@router.post("/request/{request_id}/reject")
async def reject_friend_request(
    request_id: int,
    current_user: User = Depends(get_current_active_user)
):
    """Reject a friend request"""
    friend_service = get_friend_service_dep()
    
    request = friend_service.reject_friend_request(request_id, current_user.id)
    
    return {
        "data": {
            "request_id": request.id,
            "status": "rejected"
        },
        "message": "Solicitud rechazada"
    }


@router.delete("/{friend_id}")
async def remove_friend(
    friend_id: int,
    current_user: User = Depends(get_current_active_user)
):
    """Remove a friend"""
    friend_service = get_friend_service_dep()
    
    success = friend_service.remove_friend(current_user.id, friend_id)
    
    if success:
        return {
            "message": "Amigo eliminado exitosamente"
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo eliminar el amigo"
        )


@router.get("/list")
async def get_friends_list(
    current_user: User = Depends(get_current_active_user)
):
    """Get user's friends list"""
    friend_service = get_friend_service_dep()
    
    friends = friend_service.get_user_friends(current_user.id)
    
    return {
        "data": friends,
        "total": len(friends),
        "message": f"Tienes {len(friends)} amigos"
    }


@router.get("/requests")
async def get_friend_requests(
    current_user: User = Depends(get_current_active_user)
):
    """Get pending friend requests"""
    friend_service = get_friend_service_dep()
    
    requests = friend_service.get_pending_requests(current_user.id)
    
    return {
        "data": requests,
        "message": f"Tienes {len(requests['received'])} solicitudes recibidas y {len(requests['sent'])} enviadas"
    }


@router.get("/{friend_id}/profile")
async def get_friend_profile(
    friend_id: int,
    current_user: User = Depends(get_current_active_user)
):
    """Get detailed profile of a friend"""
    friend_service = get_friend_service_dep()
    
    profile = friend_service.get_friend_profile(current_user.id, friend_id)
    
    return {
        "data": profile,
        "message": "Perfil obtenido exitosamente"
    }


@router.get("/{friend_id}/schedules")
async def get_friend_schedules(
    friend_id: int,
    current_user: User = Depends(get_current_active_user)
):
    """Get friend's public schedules for comparison"""
    friend_service = get_friend_service_dep()
    
    # Verify friendship
    if not friend_service.friendship_repo.are_friends(current_user.id, friend_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo puedes ver horarios de tus amigos"
        )
    
    from app.services.schedule_service import ScheduleService
    from app.utils.dependencies import get_db
    
    schedule_service = ScheduleService(next(get_db()))
    schedules = schedule_service.schedule_repo.get_user_schedules(friend_id)
    
    # Return only basic schedule info for comparison
    schedule_data = []
    for schedule in schedules:
        schedule_data.append({
            "id": schedule.id,
            "name": schedule.name,
            "description": schedule.description,
            "created_at": schedule.created_at.isoformat(),
            "is_favorite": schedule.is_favorite
        })
    
    return {
        "data": schedule_data,
        "total": len(schedule_data),
        "message": f"Horarios de tu amigo obtenidos"
    }


@router.get("/{friend_id}/schedules/{schedule_id}")
async def get_friend_schedule_detail(
    friend_id: int,
    schedule_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get detailed view of a friend's specific schedule"""
    from app.services.friend_service import FriendService
    from app.models.schedule import Schedule, ScheduleSession
    from app.models.course import Course
    from app.models.section import Section
    from app.models.session import Session
    from sqlalchemy.orm import joinedload
    
    friend_service = FriendService(db)
    
    # Verify friendship
    if not friend_service.friendship_repo.are_friends(current_user.id, friend_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo puedes ver horarios de tus amigos"
        )
    
    # Get the schedule with all relationships loaded
    schedule = db.query(Schedule).options(
        joinedload(Schedule.schedule_sessions)
        .joinedload(ScheduleSession.session),
        joinedload(Schedule.schedule_sessions)
        .joinedload(ScheduleSession.section)
        .joinedload(Section.course)
    ).filter(
        Schedule.id == schedule_id,
        Schedule.user_id == friend_id,
        Schedule.is_active == True
    ).first()
    
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Horario no encontrado"
        )
    
    # Build schedule data with course and session information
    schedule_data = {
        "id": schedule.id,
        "name": schedule.name,
        "description": schedule.description,
        "is_favorite": schedule.is_favorite,
        "created_at": schedule.created_at.isoformat(),
        "courses": []
    }
    
    # Group schedule sessions by course
    courses_dict = {}
    for schedule_session in schedule.schedule_sessions:
        session = schedule_session.session
        section = schedule_session.section
        course = section.course
        
        if course.id not in courses_dict:
            courses_dict[course.id] = {
                "id": course.id,
                "code": course.code,
                "name": course.name,
                "description": course.description,
                "department": course.department,
                "sections": {}
            }
        
        if section.id not in courses_dict[course.id]["sections"]:
            courses_dict[course.id]["sections"][section.id] = {
                "id": section.id,
                "section_number": section.section_number,
                "professor": section.professor,
                "capacity": section.capacity,
                "enrolled": section.enrolled,
                "sessions": []
            }
        
        courses_dict[course.id]["sections"][section.id]["sessions"].append({
            "id": session.id,
            "session_type": session.session_type,
            "day": session.day,
            "start_time": session.start_time.strftime("%H:%M"),
            "end_time": session.end_time.strftime("%H:%M"),
            "location": session.location,
            "building": session.building,
            "room": session.room,
            "modality": session.modality
        })
    
    # Convert dict to list format
    for course_data in courses_dict.values():
        course_data["sections"] = list(course_data["sections"].values())
        schedule_data["courses"].append(course_data)
    
    return {
        "data": schedule_data,
        "message": "Detalle del horario obtenido exitosamente"
    }