from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from datetime import datetime
from app.models.collaboration import CollaborativeSession, SessionParticipant
from app.repositories.base import BaseRepository


class CollaborativeSessionRepository(BaseRepository[CollaborativeSession]):
    def __init__(self, db: Session):
        super().__init__(db, CollaborativeSession)

    def get_by_session_code(self, session_code: str) -> Optional[CollaborativeSession]:
        """Get session by its unique session code"""
        return self.db.query(CollaborativeSession).filter(
            CollaborativeSession.session_code == session_code
        ).first()

    def get_active_session_by_code(self, session_code: str) -> Optional[CollaborativeSession]:
        """Get active non-expired session by code"""
        return self.db.query(CollaborativeSession).filter(
            and_(
                CollaborativeSession.session_code == session_code,
                CollaborativeSession.is_active == True,
                CollaborativeSession.expires_at > datetime.utcnow()
            )
        ).first()

    def get_sessions_by_user_participation(self, user_id: int) -> List[CollaborativeSession]:
        """Get all sessions where user is a participant"""
        return self.db.query(CollaborativeSession).join(SessionParticipant).filter(
            and_(
                SessionParticipant.user_id == user_id,
                SessionParticipant.is_active == True,
                CollaborativeSession.is_active == True
            )
        ).options(
            joinedload(CollaborativeSession.participants),
            joinedload(CollaborativeSession.university)
        ).all()

    def get_with_participants(self, session_id: int) -> Optional[CollaborativeSession]:
        """Get session with its participants loaded"""
        return self.db.query(CollaborativeSession).filter(
            CollaborativeSession.id == session_id
        ).options(
            joinedload(CollaborativeSession.participants).joinedload(SessionParticipant.user),
            joinedload(CollaborativeSession.university)
        ).first()

    def session_code_exists(self, session_code: str) -> bool:
        """Check if a session code already exists"""
        return self.db.query(CollaborativeSession).filter(
            CollaborativeSession.session_code == session_code
        ).first() is not None