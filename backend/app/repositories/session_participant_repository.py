from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from app.models.collaboration import SessionParticipant
from app.repositories.base import BaseRepository


class SessionParticipantRepository(BaseRepository[SessionParticipant]):
    def __init__(self, db: Session):
        super().__init__(db, SessionParticipant)

    def get_by_session_and_user(self, session_id: int, user_id: int) -> Optional[SessionParticipant]:
        """Get participant by session and user"""
        return self.db.query(SessionParticipant).filter(
            and_(
                SessionParticipant.session_id == session_id,
                SessionParticipant.user_id == user_id,
                SessionParticipant.is_active == True
            )
        ).first()

    def get_session_participants(self, session_id: int) -> List[SessionParticipant]:
        """Get all active participants for a session"""
        return self.db.query(SessionParticipant).filter(
            and_(
                SessionParticipant.session_id == session_id,
                SessionParticipant.is_active == True
            )
        ).options(
            joinedload(SessionParticipant.user)
        ).all()

    def count_session_participants(self, session_id: int) -> int:
        """Count active participants in a session"""
        return self.db.query(SessionParticipant).filter(
            and_(
                SessionParticipant.session_id == session_id,
                SessionParticipant.is_active == True
            )
        ).count()

    def get_user_sessions(self, user_id: int) -> List[SessionParticipant]:
        """Get all sessions user is participating in"""
        return self.db.query(SessionParticipant).filter(
            and_(
                SessionParticipant.user_id == user_id,
                SessionParticipant.is_active == True
            )
        ).options(
            joinedload(SessionParticipant.session)
        ).all()

    def get_session_participants_with_users(self, session_id: int) -> List[SessionParticipant]:
        """Get session participants with user details loaded"""
        return self.db.query(SessionParticipant).filter(
            and_(
                SessionParticipant.session_id == session_id,
                SessionParticipant.is_active == True
            )
        ).options(
            joinedload(SessionParticipant.user)
        ).all()