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
                      department: Optional[str] = None, professor: Optional[str] = None, 
                      limit: int = 20) -> List[Course]:
        """
        Search for courses with filters based on CSV data (no semester field)
        """
        db_query = self.db.query(Course).join(University).options(
            joinedload(Course.university),
            joinedload(Course.sections).joinedload(Section.sessions)
        )
        
        if university_short_name:
            db_query = db_query.filter(University.short_name == university_short_name)
        
        # Text search across course name, code, and professor
        if query and should_perform_search(query):
            search_terms = create_search_terms(query)
            
            if search_terms:
                search_conditions = []
                
                for term in search_terms:
                    normalized_term = normalize_text(term).lower()
                    
                    # Search in course name and code
                    course_conditions = or_(
                        func.lower(func.translate(
                            Course.name, 
                            'áéíóúñÁÉÍÓÚÑàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜçÇ', 
                            'aeiounAEIOUaeiouAEIOUaeiouAEIOUaeiouAEIOUcC'
                        )).ilike(f"%{normalized_term}%"),
                        func.lower(Course.code).ilike(f"%{normalized_term}%")
                    )
                    
                    # Also search in professor names if sections exist
                    professor_condition = self.db.query(Section).filter(
                        Section.course_id == Course.id,
                        func.lower(func.translate(
                            Section.professor,
                            'áéíóúñÁÉÍÓÚÑàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜçÇ', 
                            'aeiounAEIOUaeiouAEIOUaeiouAEIOUaeiouAEIOUcC'
                        )).ilike(f"%{normalized_term}%")
                    ).exists()
                    
                    # Combine course and professor search
                    term_conditions = or_(course_conditions, professor_condition)
                    search_conditions.append(term_conditions)
                
                # All terms must match (AND condition)
                if len(search_conditions) == 1:
                    db_query = db_query.filter(search_conditions[0])
                else:
                    db_query = db_query.filter(*search_conditions)
        
        # Department filter (based on course code prefix)
        if department:
            db_query = db_query.filter(Course.department == department.upper())
        
        # Professor filter (separate from general search)
        if professor:
            normalized_professor = normalize_text(professor).lower()
            professor_filter = self.db.query(Section).filter(
                Section.course_id == Course.id,
                func.lower(func.translate(
                    Section.professor,
                    'áéíóúñÁÉÍÓÚÑàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜçÇ', 
                    'aeiounAEIOUaeiouAEIOUaeiouAEIOUaeiouAEIOUcC'
                )).ilike(f"%{normalized_professor}%")
            ).exists()
            db_query = db_query.filter(professor_filter)
        
        db_query = db_query.filter(Course.is_active == True)
        
        return db_query.limit(limit).all()

    def get_by_code_and_university(self, code: str, university_id: int) -> Optional[Course]:
        """Get course by code and university ID"""
        return self.db.query(Course).filter(
            Course.code == code,
            Course.university_id == university_id,
            Course.is_active == True
        ).first()