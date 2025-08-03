from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from app.schemas import CourseWithSections
from app.utils.dependencies import get_course_service
from app.utils.text_utils import should_perform_search

router = APIRouter(prefix="/api/courses", tags=["courses"])


@router.get("/search", response_model=List[CourseWithSections])
def search_courses(
    course_service = Depends(get_course_service),
    q: Optional[str] = Query(None, description="Search query for courses, professors, or course codes"),
    university: Optional[str] = Query(None, description="University short name"),
    department: Optional[str] = Query(None, description="Department code (e.g., CS, DS, BI, HH)"),
    professor: Optional[str] = Query(None, description="Professor name"),
    limit: int = Query(20, ge=1, le=50, description="Maximum number of results")
):
    """
    Course search endpoint with debounce support (minimum 3 characters):
    - q: Search in course names, codes, and professor names
    - department: Filter by department code (extracted from course code prefix)
    - professor: Filter specifically by professor name
    - university: Filter by university
    """
    # Require minimum 3 characters for search
    if q and not should_perform_search(q, min_length=3):
        return []
    
    return course_service.search_courses(
        query=q,
        university=university,
        department=department,
        professor=professor,
        limit=limit
    )

