from typing import List, Optional
from fastapi import APIRouter, Depends, Query, File, UploadFile, HTTPException
from app.schemas import CourseWithSections, ParseCargaHabilResponse, BulkCourseDetailsRequest, BulkCourseByIdsRequest
from app.utils.dependencies import get_course_service
from app.utils.text_utils import should_perform_search
from app.services.pdf_parser import PDFParserService

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


@router.post("/parse-carga-habil", response_model=ParseCargaHabilResponse)
async def parse_carga_habil(
    file: UploadFile = File(...),
    course_service = Depends(get_course_service)
):
    """
    Parses a PDF 'Carga Hábil' file and returns lists of mandatory and elective course names.
    Uses regex for speed, then verifies and fetches true names from the database.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
        
    try:
        file_bytes = await file.read()
        raw_result = PDFParserService.parse_carga_habil(file_bytes)
        
        # Get all unique codes
        all_codes = [c["code"] for c in raw_result["mandatory"]] + [c["code"] for c in raw_result["electives"]]
        if not all_codes:
            return raw_result
            
        # Fetch actual DB courses to get perfect names and filter out invalid courses
        db_courses = course_service.get_courses_by_codes(all_codes)
        db_course_map = {c.code: c.name for c in db_courses}
        
        # Rebuild the response with verified DB courses only and correct names
        verified_mandatory = []
        for c in raw_result["mandatory"]:
            if c["code"] in db_course_map:
                verified_mandatory.append({
                    "code": c["code"],
                    "name": db_course_map[c["code"]],
                    "type": c["type"]
                })
                
        verified_electives = []
        for c in raw_result["electives"]:
            if c["code"] in db_course_map:
                verified_electives.append({
                    "code": c["code"],
                    "name": db_course_map[c["code"]],
                    "type": c["type"]
                })
                
        return {
            "mandatory": verified_mandatory,
            "electives": verified_electives
        }
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error parsing PDF: {str(e)}")


@router.post("/bulk-details", response_model=List[CourseWithSections])
def get_bulk_course_details(
    request: BulkCourseDetailsRequest,
    course_service = Depends(get_course_service)
):
    """
    Fetches full course details (with active sections and sessions) for a given list of exact course names.
    """
    if not request.course_codes:
        return []
    return course_service.get_courses_by_codes(request.course_codes, request.university_id)

@router.post("/bulk-by-ids", response_model=List[CourseWithSections])
def get_bulk_courses_by_ids(
    request: BulkCourseByIdsRequest,
    course_service = Depends(get_course_service)
):
    """
    Fetches full course details (with active sections and sessions) for a given list of database IDs.
    """
    if not request.course_ids and not request.course_names:
        return []
    return course_service.get_bulk_mixed(
        course_ids=request.course_ids,
        course_names=request.course_names,
        university_id=request.university_id
    )
