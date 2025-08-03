from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.course import Course
from app.repositories.course_repository import CourseRepository


class CourseService:
    def __init__(self, db: Session):
        self.course_repo = CourseRepository(db)

    def search_courses(self, query: Optional[str] = None, university: Optional[str] = None,
                      department: Optional[str] = None, professor: Optional[str] = None,
                      limit: int = 20) -> List[Course]:
        return self.course_repo.search_courses(
            query=query,
            university_short_name=university,
            department=department,
            professor=professor,
            limit=limit
        )

