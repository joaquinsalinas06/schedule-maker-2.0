from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from app.utils.dependencies import get_current_active_user, get_curriculum_service
from app.models.user import User
from app.schemas import (
    CurriculumListResponse,
    CurriculumTreeResponse,
    CurriculumProgressResponse,
    UpdateCourseStatusRequest,
    BulkUpdateStatusRequest,
    UnlockedCoursesResponse,
    SetCurriculumRequest,
    PlanningDataResponse,
    BulkPlanningRequest,
)

router = APIRouter(prefix="/api/curricula", tags=["curriculum"])


@router.get("", response_model=List[CurriculumListResponse])
def list_curricula(
    university_id: Optional[int] = Query(None),
    curriculum_service=Depends(get_curriculum_service),
    current_user: User = Depends(get_current_active_user),
):
    uid = university_id or current_user.university_id
    return curriculum_service.list_curricula(uid)


@router.get("/{curriculum_id}")
def get_curriculum_tree(
    curriculum_id: int,
    curriculum_service=Depends(get_curriculum_service),
    current_user: User = Depends(get_current_active_user),
):
    tree = curriculum_service.get_curriculum_tree(curriculum_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Curriculum not found")
    return tree


@router.get("/{curriculum_id}/progress")
def get_progress(
    curriculum_id: int,
    curriculum_service=Depends(get_curriculum_service),
    current_user: User = Depends(get_current_active_user),
):
    return curriculum_service.get_progress(current_user.id, curriculum_id)


@router.post("/{curriculum_id}/progress")
def update_course_status(
    curriculum_id: int,
    request: UpdateCourseStatusRequest,
    curriculum_service=Depends(get_curriculum_service),
    current_user: User = Depends(get_current_active_user),
):
    result = curriculum_service.update_course_status(
        current_user.id, curriculum_id, request.curriculum_course_id, request.status
    )
    return {
        "curriculum_course_id": result.curriculum_course_id,
        "status": result.status,
        "completed_at": result.completed_at.isoformat() if result.completed_at else None,
    }


@router.post("/{curriculum_id}/progress/bulk")
def bulk_update_status(
    curriculum_id: int,
    request: BulkUpdateStatusRequest,
    curriculum_service=Depends(get_curriculum_service),
    current_user: User = Depends(get_current_active_user),
):
    results = curriculum_service.bulk_update_status(
        current_user.id, curriculum_id,
        [u.model_dump() for u in request.updates]
    )
    return [
        {
            "curriculum_course_id": r.curriculum_course_id,
            "status": r.status,
        }
        for r in results
    ]


@router.get("/{curriculum_id}/unlocked")
def get_unlocked_courses(
    curriculum_id: int,
    curriculum_service=Depends(get_curriculum_service),
    current_user: User = Depends(get_current_active_user),
):
    return curriculum_service.get_unlocked_courses(current_user.id, curriculum_id)


@router.put("/user/curriculum")
def set_user_curriculum(
    request: SetCurriculumRequest,
    curriculum_service=Depends(get_curriculum_service),
    current_user: User = Depends(get_current_active_user),
):
    curriculum_service.set_user_curriculum(current_user.id, request.curriculum_id)
    return {"message": "Curriculum updated", "curriculum_id": request.curriculum_id}

@router.get("/{curriculum_id}/planning", response_model=PlanningDataResponse)
def get_planning_data(
    curriculum_id: int,
    curriculum_service=Depends(get_curriculum_service),
    current_user: User = Depends(get_current_active_user),
):
    return curriculum_service.get_planning_data(current_user.id, curriculum_id)

@router.post("/{curriculum_id}/planning", response_model=PlanningDataResponse)
def update_planning_data(
    curriculum_id: int,
    request: BulkPlanningRequest,
    curriculum_service=Depends(get_curriculum_service),
    current_user: User = Depends(get_current_active_user),
):
    plans = [p.model_dump() for p in request.plans]
    elective_links = [e.model_dump() for e in request.elective_links]
    return curriculum_service.update_planning_data(
        current_user.id, curriculum_id, plans, elective_links
    )
