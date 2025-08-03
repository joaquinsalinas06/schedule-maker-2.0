from typing import List
from sqlalchemy.orm import Session
from app.models.section import Section
from app.models.session import Session as SessionModel
from app.repositories.base import BaseRepository


class SectionRepository(BaseRepository[Section]):
    def __init__(self, db: Session):
        super().__init__(db, Section)

    def get_by_course_and_number(self, course_id: int, section_number: str) -> Section:
        """Get section by course ID and section number"""
        return self.db.query(Section).filter(
            Section.course_id == course_id,
            Section.section_number == section_number,
            Section.is_active == True
        ).first()