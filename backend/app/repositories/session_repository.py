from typing import List
from sqlalchemy.orm import Session
from app.models.session import Session as SessionModel
from app.repositories.base import BaseRepository


class SessionRepository(BaseRepository[SessionModel]):
    def __init__(self, db: Session):
        super().__init__(db, SessionModel)

    def get_by_section(self, section_id: int) -> List[SessionModel]:
        return self.db.query(SessionModel).filter(
            SessionModel.section_id == section_id,
            SessionModel.is_active == True
        ).all()

    def get_by_sections(self, section_ids: List[int]) -> List[SessionModel]:
        return self.db.query(SessionModel).filter(
            SessionModel.section_id.in_(section_ids),
            SessionModel.is_active == True
        ).all()