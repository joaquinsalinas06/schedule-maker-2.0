from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from app.models.course import Course
from app.models.university import University
from app.models.section import Section
from app.models.session import Session as SessionModel
from app.repositories.base import BaseRepository
from app.utils.text_utils import normalize_text, create_search_terms, should_perform_search


class CourseRepository(BaseRepository[Course]):
    def __init__(self, db: Session):
        super().__init__(db, Course)

    def search_courses(self, query: Optional[str] = None, university_short_name: Optional[str] = None,
                      department: Optional[str] = None, semester: Optional[str] = None, skip: int = 0, limit: int = 20) -> List[Course]:
        db_query = self.db.query(Course).join(University).options(
            joinedload(Course.university),
            joinedload(Course.sections).joinedload(Section.sessions)
        )
        
        if university_short_name:
            db_query = db_query.filter(University.short_name == university_short_name)
        
        if query and should_perform_search(query):
            # Normalize the search query for accent-insensitive search
            search_terms = create_search_terms(query)
            
            if search_terms:
                # Create search conditions for each term using accent-insensitive search
                search_conditions = []
                
                for term in search_terms:
                    # Normalize the search term to remove accents  
                    normalized_term = normalize_text(term).lower()
                    
                    # Use PostgreSQL's TRANSLATE function to remove accents from database fields
                    # This maps accented characters to their non-accented equivalents
                    term_conditions = or_(
                        func.lower(func.translate(
                            Course.name, 
                            'áéíóúñÁÉÍÓÚÑàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜçÇ', 
                            'aeiounAEIOUaeiouAEIOUaeiouAEIOUaeiouAEIOUcC'
                        )).ilike(f"%{normalized_term}%"),
                        func.lower(func.translate(
                            Course.code,
                            'áéíóúñÁÉÍÓÚÑàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜçÇ', 
                            'aeiounAEIOUaeiouAEIOUaeiouAEIOUaeiouAEIOUcC'
                        )).ilike(f"%{normalized_term}%"),
                        func.lower(func.translate(
                            Course.description,
                            'áéíóúñÁÉÍÓÚÑàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜçÇ', 
                            'aeiounAEIOUaeiouAEIOUaeiouAEIOUaeiouAEIOUcC'
                        )).ilike(f"%{normalized_term}%")
                    )
                    
                    search_conditions.append(term_conditions)
                
                # All terms must match (AND condition)
                if len(search_conditions) == 1:
                    db_query = db_query.filter(search_conditions[0])
                else:
                    db_query = db_query.filter(*search_conditions)
        
        if department:
            db_query = db_query.filter(Course.department == department)
        
        # TODO: Enable semester filtering once database schema is updated
        # For now, ignore semester filter to allow search to work with real data
        # if semester:
        #     db_query = db_query.filter(Course.semester == semester)
        
        db_query = db_query.filter(Course.is_active == True)
        
        return db_query.offset(skip).limit(limit).all()

    def get_course_with_sections(self, course_id: int) -> Optional[Course]:
        return self.db.query(Course).filter(
            Course.id == course_id,
            Course.is_active == True
        ).options(
            joinedload(Course.sections).joinedload(Section.sessions)
        ).first()

    def get_courses_by_university(self, university_id: int, skip: int = 0, limit: int = 20) -> List[Course]:
        return self.db.query(Course).filter(
            Course.university_id == university_id,
            Course.is_active == True
        ).options(
            joinedload(Course.university),
            joinedload(Course.sections).joinedload(Section.sessions)
        ).offset(skip).limit(limit).all()

    def get_departments(self, university_short_name: Optional[str] = None) -> List[str]:
        query = self.db.query(Course.department).distinct()
        
        if university_short_name:
            query = query.join(University).filter(University.short_name == university_short_name)
        
        query = query.filter(Course.is_active == True, Course.department.isnot(None))
        
        return [dept[0] for dept in query.all()]

    def get_by_codes(self, course_codes: List[str]) -> List[Course]:
        return self.db.query(Course).filter(
            Course.code.in_(course_codes),
            Course.is_active == True
        ).all()

    def get_by_code_pattern(self, code_pattern: str) -> List[Course]:
        return self.db.query(Course).filter(
            Course.code.ilike(f"%{code_pattern}%"),
            Course.is_active == True
        ).all()

    def get_by_code_and_university(self, code: str, university_id: int) -> Optional[Course]:
        """Get course by code and university ID"""
        return self.db.query(Course).filter(
            Course.code == code,
            Course.university_id == university_id,
            Course.is_active == True
        ).first()