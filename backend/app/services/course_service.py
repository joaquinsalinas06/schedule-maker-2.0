from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.course import Course
from app.models.university import University
from app.repositories.course_repository import CourseRepository
from app.repositories.university_repository import UniversityRepository
from fastapi import HTTPException, status


class CourseService:
    def __init__(self, db: Session):
        self.course_repo = CourseRepository(db)
        self.university_repo = UniversityRepository(db)

    def search_courses(self, query: Optional[str] = None, university: Optional[str] = None,
                      department: Optional[str] = None, semester: Optional[str] = None, 
                      page: int = 1, size: int = 20) -> List[Course]:
        skip = (page - 1) * size
        return self.course_repo.search_courses(
            query=query,
            university_short_name=university,
            department=department,
            semester=semester,
            skip=skip,
            limit=size
        )

    def get_course_with_sections(self, course_id: int) -> Course:
        course = self.course_repo.get_course_with_sections(course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        return course

    def get_courses_by_university(self, university_id: int, page: int = 1, size: int = 20) -> List[Course]:
        # Check if university exists
        university = self.university_repo.get(university_id)
        if not university:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="University not found"
            )
        
        skip = (page - 1) * size
        return self.course_repo.get_courses_by_university(university_id, skip, size)

    def get_departments(self, university: Optional[str] = None) -> List[str]:
        return self.course_repo.get_departments(university)