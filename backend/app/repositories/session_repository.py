from typing import List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import and_
import hashlib
import json
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

    def calculate_content_hash(self, session_data: dict) -> str:
        """
        Calculate SHA-256 hash of session content for change detection

        Includes all session-defining fields except section_id
        """
        hash_content = {
            "session_type": session_data.get("session_type"),
            "day": session_data.get("day"),
            "start_time": str(session_data.get("start_time")),
            "end_time": str(session_data.get("end_time")),
            "location": session_data.get("location"),
            "building": session_data.get("building"),
            "room": session_data.get("room"),
            "modality": session_data.get("modality"),
            "frequency": session_data.get("frequency")
        }
        content_str = json.dumps(hash_content, sort_keys=True)
        return hashlib.sha256(content_str.encode()).hexdigest()

    def bulk_create_sessions(self, sessions_data: List[dict]) -> int:
        """
        Batch create sessions with hash calculation

        Returns the number of sessions created
        """
        for session_data in sessions_data:
            session_data["content_hash"] = self.calculate_content_hash(session_data)

        session_objects = [SessionModel(**session) for session in sessions_data]
        self.db.bulk_save_objects(session_objects)
        self.db.commit()
        return len(session_objects)

    def get_by_sections_bulk(self, section_ids: List[int]) -> Dict[int, List[SessionModel]]:
        """
        Get sessions for multiple sections, returning dict[section_id -> List[Session]]

        This eliminates N+1 queries by fetching all sessions at once and grouping them
        """
        if not section_ids:
            return {}

        sessions = self.db.query(SessionModel).filter(
            and_(
                SessionModel.section_id.in_(section_ids),
                SessionModel.is_active == True
            )
        ).all()

        # Group by section_id
        result = {}
        for session in sessions:
            if session.section_id not in result:
                result[session.section_id] = []
            result[session.section_id].append(session)
        return result