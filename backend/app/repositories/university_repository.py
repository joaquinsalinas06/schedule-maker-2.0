from typing import Optional
from sqlalchemy.orm import Session
from app.models.university import University
from app.repositories.base import BaseRepository


class UniversityRepository(BaseRepository[University]):
    def __init__(self, db: Session):
        super().__init__(db, University)

    def get_by_short_name(self, short_name: str) -> Optional[University]:
        return self.db.query(University).filter(University.short_name == short_name).first()

    def get_by_name(self, name: str) -> Optional[University]:
        return self.db.query(University).filter(University.name == name).first()
    
    def get_by_id(self, university_id: int) -> Optional[University]:
        return self.db.query(University).filter(University.id == university_id).first()