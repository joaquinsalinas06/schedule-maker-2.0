from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database.connection import get_db
from app.models import User
from app.schemas import ScheduleResponse, APIResponse
from app.utils.dependencies import get_current_active_user
from app.services.schedule_service import ScheduleService

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


class GenerateScheduleRequest(BaseModel):
    """Request to generate all possible schedule combinations from selected sections"""
    selected_sections: List[int]  # List of specific section IDs user wants to consider
    semester: Optional[str] = "2024-2"


class SaveScheduleRequest(BaseModel):
    """Request to save a schedule combination"""
    combination_id: str
    name: str
    description: Optional[str] = None
    semester: Optional[str] = "ciclo-1"
    combination: Optional[dict] = None  # Include the actual course data


class UserCoursesResponse(BaseModel):
    """Response with courses available for user's university"""
    course_id: int
    course_code: str
    course_name: str
    credits: int
    department: str
    sections: List[dict]


# STEP 1: Get available courses and sections for user's university
@router.get("/courses", response_model=List[UserCoursesResponse])
def get_available_courses(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    semester: Optional[str] = "2024-2"
):
    """
    Get all courses available for user's university with their sections.
    This is step 1: User sees all courses from their university.
    """
    schedule_service = ScheduleService(db)
    courses_data = schedule_service.get_available_courses_for_user(current_user, semester)
    
    return [
        UserCoursesResponse(
            course_id=course["course_id"],
            course_code=course["course_code"],
            course_name=course["course_name"],
            credits=course["credits"],
            department=course["department"],
            sections=course["sections"]
        )
        for course in courses_data
    ]


# STEP 2: Generate combinations from selected COURSES (MAIN METHOD)
@router.post("/generate", response_model=APIResponse)
def generate_schedule_combinations(
    request: GenerateScheduleRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate all possible schedule combinations from selected sections.
    
    CORRECT User workflow:
    1. User picks specific sections they like (e.g., [1, 3, 5] from Course A, [7, 9] from Course B)
    2. System groups sections by course
    3. System generates ALL valid combinations where ALL courses are represented
    4. User gets combinations like: CourseA-Section1 + CourseB-Section7, CourseA-Section3 + CourseB-Section9, etc.
    
    Example: User selects 3 sections from Course A and 2 sections from Course B
    Result: 3×2 = 6 possible schedules (minus conflicts), all containing both courses
    """
    
    try:
        schedule_service = ScheduleService(db)
        result_data = schedule_service.generate_schedule_combinations_from_sections(
            user=current_user,
            selected_sections=request.selected_sections,
            semester=request.semester
        )
        
        print(f"Generated {result_data['total_combinations']} valid combinations from {result_data['selected_courses_count']} courses")

        return APIResponse(
            data=result_data,
            message=f"Generated {result_data['total_combinations']} valid schedule combinations from {result_data['selected_courses_count']} courses"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating combinations: {str(e)}"
        )


# STEP 3: Save a favorite combination as a personal schedule
@router.post("/save", response_model=APIResponse)
async def save_favorite_schedule(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Save a specific combination as a user's schedule.
    User picks one combination from the generated options and saves it.
    """
    
    # Debug logging - raw request
    try:
        body = await request.body()
        body_str = body.decode('utf-8')
        content_type = request.headers.get('content-type', '')
        
        print(f"=== SAVE SCHEDULE DEBUG ===")
        print(f"Content-Type: {content_type}")
        print(f"Raw body: {body_str}")
        print(f"===========================")
        
        # Handle both JSON and form-encoded data
        if 'application/json' in content_type:
            # Parse as JSON
            import json
            json_data = json.loads(body_str)
            print(f"Parsing as JSON...")
            schedule_data = SaveScheduleRequest(**json_data)
        else:
            # Parse as form-encoded data
            from urllib.parse import parse_qs
            print(f"Parsing as form data...")
            parsed_data = parse_qs(body_str)
            
            # Extract values (parse_qs returns lists, so take first value)
            json_data = {
                'combination_id': parsed_data.get('combination_id', [''])[0],
                'name': parsed_data.get('name', [''])[0],
                'description': parsed_data.get('description', [''])[0],
                'semester': parsed_data.get('semester', ['ciclo-1'])[0]
            }
            schedule_data = SaveScheduleRequest(**json_data)
        
        print(f"=== PARSED DATA ===")
        print(f"combination_id: {schedule_data.combination_id}")
        print(f"name: {schedule_data.name}")
        print(f"description: {schedule_data.description}")
        print(f"semester: {schedule_data.semester}")
        print(f"combination: {schedule_data.combination}")
        if schedule_data.combination:
            print(f"combination keys: {list(schedule_data.combination.keys()) if isinstance(schedule_data.combination, dict) else 'Not a dict'}")
            if isinstance(schedule_data.combination, dict) and 'courses' in schedule_data.combination:
                print(f"number of courses: {len(schedule_data.combination['courses'])}")
        print(f"==================")
        
    except Exception as e:
        print(f"=== ERROR PARSING REQUEST ===")
        print(f"Error: {e}")
        print(f"Error type: {type(e)}")
        print(f"=============================")
        raise HTTPException(status_code=422, detail=f"Invalid request data: {e}")
    
    print(f"current_user: {current_user.id if current_user else 'None'}")
    
    schedule_service = ScheduleService(db)
    result_data = schedule_service.save_schedule(
        user=current_user,
        combination_id=schedule_data.combination_id,
        name=schedule_data.name,
        description=schedule_data.description,
        semester=schedule_data.semester
    )
    
    print(f"=== SAVE SCHEDULE SERVICE RESPONSE ===")
    print(f"result_data: {result_data}")
    print(f"result_data type: {type(result_data)}")
    if isinstance(result_data, dict):
        print(f"result_data keys: {list(result_data.keys())}")
        for key, value in result_data.items():
            print(f"  {key}: {value}")
    print(f"=====================================")
    
    response = APIResponse(
        data=result_data,
        message="Schedule combination saved successfully"
    )
    
    print(f"=== FINAL API RESPONSE ===")
    print(f"response: {response}")
    print(f"response.data: {response.data}")
    print(f"=========================")
    
    return response


# Get saved schedules (simplified)
@router.get("/saved", response_model=List[ScheduleResponse])
def get_saved_schedules(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's saved favorite schedules"""
    
    schedule_service = ScheduleService(db)
    return schedule_service.get_user_schedules(current_user)


# Delete a saved schedule (simplified)
@router.delete("/saved/{schedule_id}", response_model=APIResponse)
def delete_saved_schedule(
    schedule_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a saved schedule"""
    
    schedule_service = ScheduleService(db)
    schedule_service.delete_schedule(current_user, schedule_id)
    
    return APIResponse(
        message="Schedule deleted successfully"
    )