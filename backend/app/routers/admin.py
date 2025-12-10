from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
import hashlib
import json
from datetime import datetime

from app.utils.dependencies import get_db, get_current_active_user
from app.models.user import User
from app.services.import_service import ImportService
from app.services.scraping_service import ScrapingService
from app.repositories.university_repository import UniversityRepository
from app.repositories.academic_period_repository import AcademicPeriodRepository
from app.repositories.enrollment_snapshot_repository import EnrollmentSnapshotRepository
from app.repositories.import_log_repository import ImportLogRepository
from app.parsers.parser_factory import ParserFactory, ParserException
from app.scrapers.base_scraper import ScraperException

router = APIRouter(prefix="/api/admin", tags=["admin"])


def get_current_admin_user(current_user: User = Depends(get_current_active_user)):
    """Dependency to ensure user is admin"""
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access this endpoint"
        )
    return current_user


@router.post("/upload-csv")
async def upload_course_data(
    file: UploadFile = File(...),
    university_id: Optional[int] = None,
    academic_period_id: Optional[int] = None,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Upload CSV/PDF file for course data import (Admin only)

    - Automatically detects file format and university parser
    - Creates enrollment snapshots for historical tracking
    - Returns import statistics

    Returns:
        - status: "success" or "error"
        - import_log_id: ID of the import log entry
        - statistics: Import statistics (courses_processed, sections_added, etc.)
        - university: University name
        - academic_period: Period code
        - file_hash: SHA-256 hash of uploaded file
    """
    # Read file content
    file_content = await file.read()
    file_hash = hashlib.sha256(file_content).hexdigest()

    # Get university (use current user's university if not specified)
    if not university_id:
        university_id = current_user.university_id

    university_repo = UniversityRepository(db)
    university = university_repo.get(university_id)
    if not university:
        raise HTTPException(status_code=404, detail="University not found")

    # Get or detect academic period
    period_repo = AcademicPeriodRepository(db)
    if academic_period_id:
        period = period_repo.get(academic_period_id)
        if not period or period.university_id != university_id:
            raise HTTPException(status_code=404, detail="Academic period not found")
    else:
        # Use current period
        period = period_repo.get_current_period(university_id)
        if not period:
            raise HTTPException(
                status_code=400,
                detail="No current academic period set. Please create one first."
            )

    # Get parser configuration
    parser_config = university.parser_configuration
    if not parser_config:
        raise HTTPException(
            status_code=400,
            detail="No parser configuration found for this university. Please configure a parser first."
        )

    # Create parser
    try:
        config_dict = json.loads(parser_config.config_json) if parser_config.config_json else {}
        parser = ParserFactory.create_parser(parser_config.parser_class, config_dict)
    except ParserException as e:
        raise HTTPException(status_code=400, detail=f"Parser error: {str(e)}")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Invalid parser configuration JSON: {str(e)}")

    # Validate file format
    if not parser.validate_format(file_content, file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"File format not supported by {parser_config.parser_class}"
        )

    # Parse file
    try:
        parsed_courses = parser.parse(file_content, file.filename)
    except ParserException as e:
        raise HTTPException(status_code=400, detail=f"Parsing failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected parsing error: {str(e)}")

    # Import to database
    import_service = ImportService(db)
    try:
        log_id, stats = import_service.import_courses(
            parsed_courses=parsed_courses,
            university_id=university_id,
            academic_period_id=period.id,
            import_type='csv_upload',
            source_file=file.filename,
            file_hash=file_hash
        )

        return {
            "status": "success",
            "import_log_id": log_id,
            "statistics": stats,
            "university": university.name,
            "academic_period": period.period_code,
            "file_hash": file_hash
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Import failed: {str(e)}"
        )


@router.get("/enrollment-history/{section_id}")
async def get_enrollment_history(
    section_id: int,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get historical enrollment snapshots for a section

    Returns enrollment history with timestamps for tracking how capacity/enrolled changed over time.
    """
    snapshot_repo = EnrollmentSnapshotRepository(db)
    snapshots = snapshot_repo.get_section_history(section_id, limit)

    return {
        "section_id": section_id,
        "total_snapshots": len(snapshots),
        "snapshots": [
            {
                "capacity": s.capacity,
                "enrolled": s.enrolled,
                "waitlisted": s.waitlisted,
                "available": s.capacity - s.enrolled,
                "professor": s.professor,
                "timestamp": s.snapshot_timestamp.isoformat(),
                "import_source": s.import_source
            }
            for s in snapshots
        ]
    }


@router.get("/import-logs")
async def get_import_logs(
    university_id: Optional[int] = None,
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get recent import logs for monitoring

    Shows history of all imports with status, statistics, and errors.
    """
    if not university_id:
        university_id = current_user.university_id

    log_repo = ImportLogRepository(db)
    logs = log_repo.get_recent_logs(university_id, limit)

    return {
        "total_logs": len(logs),
        "logs": [
            {
                "id": log.id,
                "import_type": log.import_type,
                "status": log.status.value,
                "started_at": log.started_at.isoformat(),
                "completed_at": log.completed_at.isoformat() if log.completed_at else None,
                "duration_seconds": (
                    (log.completed_at - log.started_at).total_seconds()
                    if log.completed_at else None
                ),
                "source_file": log.source_file,
                "statistics": {
                    "courses_processed": log.courses_processed,
                    "sections_added": log.sections_added,
                    "sections_updated": log.sections_updated,
                    "sections_deactivated": log.sections_deactivated,
                    "sessions_added": log.sessions_added,
                    "sessions_updated": log.sessions_updated
                },
                "error_message": log.error_message
            }
            for log in logs
        ]
    }


@router.post("/academic-periods")
async def create_academic_period(
    period_code: str,
    period_name: str,
    start_date: str,  # ISO format: "2025-01-15"
    end_date: str,    # ISO format: "2025-06-30"
    set_as_current: bool = False,
    university_id: Optional[int] = None,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Create a new academic period (semester/cycle)

    Example:
        {
            "period_code": "26-1",
            "period_name": "Spring 2026",
            "start_date": "2026-01-15",
            "end_date": "2026-06-30",
            "set_as_current": true
        }
    """
    if not university_id:
        university_id = current_user.university_id

    period_repo = AcademicPeriodRepository(db)

    # Check if period already exists
    existing = period_repo.get_by_code(university_id, period_code)
    if existing:
        raise HTTPException(status_code=400, detail=f"Period {period_code} already exists")

    # Parse dates
    try:
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")

    if start_dt >= end_dt:
        raise HTTPException(status_code=400, detail="Start date must be before end date")

    # Create period
    period_data = {
        "university_id": university_id,
        "period_code": period_code,
        "period_name": period_name,
        "start_date": start_dt,
        "end_date": end_dt,
        "is_current": set_as_current,
        "is_active": True
    }

    period = period_repo.create(period_data)

    # If setting as current, deactivate others
    if set_as_current:
        period_repo.set_current_period(period.id, university_id)

    return {
        "status": "success",
        "period": {
            "id": period.id,
            "period_code": period.period_code,
            "period_name": period.period_name,
            "start_date": period.start_date.isoformat(),
            "end_date": period.end_date.isoformat(),
            "is_current": period.is_current
        }
    }


@router.put("/academic-periods/{period_id}/set-current")
async def set_current_period(
    period_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Set an academic period as current

    This switches all course searches to this period.
    Only one period can be current per university at a time.
    """
    period_repo = AcademicPeriodRepository(db)
    period = period_repo.set_current_period(period_id, current_user.university_id)

    if not period:
        raise HTTPException(status_code=404, detail="Period not found")

    return {
        "status": "success",
        "message": f"Academic period '{period.period_code}' is now current",
        "period": {
            "id": period.id,
            "period_code": period.period_code,
            "period_name": period.period_name,
            "is_current": period.is_current
        }
    }


@router.get("/academic-periods")
async def get_academic_periods(
    university_id: Optional[int] = None,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get all academic periods for a university
    """
    if not university_id:
        university_id = current_user.university_id

    period_repo = AcademicPeriodRepository(db)
    periods = period_repo.get_all_by_university(university_id)

    return {
        "total_periods": len(periods),
        "periods": [
            {
                "id": p.id,
                "period_code": p.period_code,
                "period_name": p.period_name,
                "start_date": p.start_date.isoformat(),
                "end_date": p.end_date.isoformat(),
                "is_current": p.is_current,
                "created_at": p.created_at.isoformat()
            }
            for p in periods
        ]
    }


@router.post("/scrape-enrollment")
async def scrape_university_enrollment(
    university_id: Optional[int] = None,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Trigger automated scraping of enrollment data for a university

    This endpoint:
    1. Loads scraper configuration from database
    2. Runs Selenium-based scraper to extract enrollment data
    3. Imports scraped data using ImportService
    4. Returns import statistics

    Designed to be called by:
    - n8n workflows (scheduled hourly)
    - Manual admin triggers
    - CLI scripts

    Example:
        POST /api/admin/scrape-enrollment?university_id=1
    """
    if not university_id:
        university_id = current_user.university_id

    scraping_service = ScrapingService(db)

    try:
        log_id, stats = scraping_service.scrape_university_enrollment(university_id)

        return {
            "success": True,
            "message": "Enrollment data scraped successfully",
            "import_log_id": log_id,
            "statistics": stats
        }

    except ScraperException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scraping failed: {str(e)}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )


@router.post("/validate-scraper/{university_id}")
async def validate_scraper_configuration(
    university_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Validate that scraper configuration is correct

    Tests:
    - Scraper configuration exists
    - URL is accessible
    - Expected page elements are present
    - Login works (if required)

    Example:
        POST /api/admin/validate-scraper/1
    """
    scraping_service = ScrapingService(db)

    try:
        is_valid = scraping_service.validate_scraper_configuration(university_id)

        return {
            "success": True,
            "message": "Scraper configuration is valid",
            "university_id": university_id,
            "is_valid": is_valid
        }

    except ScraperException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Validation failed: {str(e)}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
