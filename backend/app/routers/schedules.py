from typing import List, Optional
from fastapi import APIRouter, Depends
from app.models import User
from app.schemas import ScheduleResponse, APIResponse, GenerateScheduleRequest, SaveScheduleRequest
from app.utils.dependencies import get_current_active_user, get_schedule_service

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


# STEP 1: Generate combinations from selected COURSES (MAIN METHOD)
@router.post("/generate", response_model=APIResponse)
def generate_schedule_combinations(
    request: GenerateScheduleRequest,
    current_user: User = Depends(get_current_active_user),
    schedule_service = Depends(get_schedule_service)
):    
    """Generate all possible schedule combinations from selected sections"""
    result_data = schedule_service.generate_schedule_combinations(request, current_user)
    
    return APIResponse(
        data=result_data,
        message=f"Generated {result_data['total_combinations']} valid schedule combinations from {result_data['selected_courses_count']} courses"
    )


# STEP 2: Save a favorite combination as a personal schedule
@router.post("/save", response_model=APIResponse)
async def save_favorite_schedule(
    request: SaveScheduleRequest,
    current_user: User = Depends(get_current_active_user),
    schedule_service = Depends(get_schedule_service)
):
    """
    Save a specific combination as a user's schedule.
    User picks one combination from the generated options and saves it.
    """
    result = await schedule_service.save_schedule_from_request(request, current_user)
    
    return APIResponse(
        data=result,
        message="Schedule saved successfully"
    )


# Get saved schedules (simplified)
@router.get("/saved")
def get_saved_schedules(
    current_user: User = Depends(get_current_active_user),
    schedule_service = Depends(get_schedule_service)
):
    """Get user's saved favorite schedules with combination data"""
    return schedule_service.get_user_schedules(current_user)


# Delete a saved schedule (simplified)
@router.delete("/saved/{schedule_id}", response_model=APIResponse)
def delete_saved_schedule(
    schedule_id: int,
    current_user: User = Depends(get_current_active_user),
    schedule_service = Depends(get_schedule_service)
):
    """Delete a saved schedule"""
    schedule_service.delete_user_schedule(schedule_id, current_user)
    
    return APIResponse(
        message="Schedule deleted successfully"
    )