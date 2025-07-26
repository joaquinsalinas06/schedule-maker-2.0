from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas import CourseResponse, CourseWithSections, APIResponse, CSVImportResponse, CSVAnalysisResponse
from app.services.course_service import CourseService
from app.services.csv_import_service import CSVImportService
from app.utils.text_utils import should_perform_search

router = APIRouter(prefix="/api/courses", tags=["courses"])

@router.get("/search", response_model=List[CourseWithSections])
def search_courses(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Search query"),
    university: Optional[str] = Query(None, description="University short name"), 
    department: Optional[str] = Query(None, description="Department"),
    semester: Optional[str] = Query(None, description="Semester"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100)
):
    # Return empty list if search query is too short
    if q and not should_perform_search(q):
        return []
    
    course_service = CourseService(db)
    return course_service.search_courses(
        query=q,
        university=university,
        department=department,
        semester=semester,
        page=page,
        size=size
    )

@router.get("/autocomplete", response_model=List[CourseWithSections])
def autocomplete_courses(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Search query for autocomplete"),
    university: Optional[str] = Query(None, description="University short name"),
    limit: int = Query(10, ge=1, le=20, description="Maximum number of suggestions")
):
    """
    Fast autocomplete endpoint with minimum 3 character requirement
    Returns top matching courses for typeahead functionality
    """
    # Require minimum 3 characters for autocomplete
    if not q or not should_perform_search(q, min_length=3):
        return []
    
    course_service = CourseService(db)
    return course_service.search_courses(
        query=q,
        university=university,
        page=1,
        size=limit
    )

@router.get("/{course_id}", response_model=CourseWithSections)
def get_course_with_sections(course_id: int, db: Session = Depends(get_db)):
    course_service = CourseService(db)
    return course_service.get_course_with_sections(course_id)

@router.get("/university/{university_id}", response_model=List[CourseResponse])
def get_courses_by_university(
    university_id: int,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100)
):
    course_service = CourseService(db)
    return course_service.get_courses_by_university(university_id, page, size)

@router.get("/departments", response_model=List[str])
def get_departments(university: Optional[str] = Query(None), db: Session = Depends(get_db)):
    course_service = CourseService(db)
    return course_service.get_departments(university)

@router.post("/import-csv", response_model=CSVImportResponse)
async def import_courses_csv(
    file: UploadFile = File(...),
    university_id: int = Query(1, description="University ID to import courses to"),
    db: Session = Depends(get_db)
):
    """
    Import courses from CSV file
    
    Expected CSV format:
    - Should have columns: Código Curso, Curso, Sección, Sesión Grupo, Modalidad, Horario, Ubicación, Vacantes, Matriculados, Docente, Correo
    - Horario format: 'Mie. 09:00 - 11:00'
    - Location format: 'UTEC-BA A907(48)'
    """
    # Validate file type
    if not file.filename.endswith(('.csv', '.CSV')):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are supported"
        )
    
    import_service = CSVImportService(db)
    result = await import_service.import_csv_file(file, university_id)
    
    return result

@router.post("/analyze-csv", response_model=CSVAnalysisResponse)
async def analyze_csv_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Analyze CSV file without importing - provides statistics and validation
    """
    # Validate file type
    if not file.filename.endswith(('.csv', '.CSV')):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are supported"
        )
    
    import_service = CSVImportService(db)
    result = import_service.analyze_csv_file(file)
    
    return result