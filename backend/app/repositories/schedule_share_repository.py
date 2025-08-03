from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from datetime import datetime
from app.models.collaboration import ScheduleShare
from app.repositories.base import BaseRepository


class ScheduleShareRepository(BaseRepository[ScheduleShare]):
    def __init__(self, db: Session):
        super().__init__(db, ScheduleShare)

    def get_by_token(self, share_token: str, active_only: bool = False, non_expired_only: bool = False) -> Optional[ScheduleShare]:
        """Get share by token with optional filters"""
        query = self.db.query(ScheduleShare).filter(
            ScheduleShare.share_token == share_token
        )
        
        if active_only:
            query = query.filter(ScheduleShare.is_active == True)
        
        if non_expired_only:
            now = datetime.utcnow()
            query = query.filter(
                or_(
                    ScheduleShare.expires_at.is_(None),
                    ScheduleShare.expires_at > now
                )
            )
        
        return query.options(
            joinedload(ScheduleShare.schedule),
            joinedload(ScheduleShare.sharer),
            joinedload(ScheduleShare.recipient)
        ).first()

    def get_by_share_token(self, share_token: str) -> Optional[ScheduleShare]:
        """Get share by its unique token"""
        return self.db.query(ScheduleShare).filter(
            ScheduleShare.share_token == share_token
        ).options(
            joinedload(ScheduleShare.schedule),
            joinedload(ScheduleShare.sharer),
            joinedload(ScheduleShare.recipient)
        ).first()

    def get_active_share_by_token(self, share_token: str) -> Optional[ScheduleShare]:
        """Get active non-expired share by token"""
        now = datetime.utcnow()
        return self.db.query(ScheduleShare).filter(
            and_(
                ScheduleShare.share_token == share_token,
                ScheduleShare.is_active == True,
                or_(
                    ScheduleShare.expires_at.is_(None),
                    ScheduleShare.expires_at > now
                )
            )
        ).options(
            joinedload(ScheduleShare.schedule),
            joinedload(ScheduleShare.sharer),
            joinedload(ScheduleShare.recipient)
        ).first()

    def get_user_shared_schedules(self, user_id: int) -> List[ScheduleShare]:
        """Get all schedules shared by a user"""
        return self.db.query(ScheduleShare).filter(
            and_(
                ScheduleShare.shared_by == user_id,
                ScheduleShare.is_active == True
            )
        ).options(
            joinedload(ScheduleShare.schedule),
            joinedload(ScheduleShare.recipient)
        ).all()

    def get_schedules_shared_with_user(self, user_id: int) -> List[ScheduleShare]:
        """Get all schedules shared with a user"""
        return self.db.query(ScheduleShare).filter(
            and_(
                ScheduleShare.shared_with == user_id,
                ScheduleShare.is_active == True
            )
        ).options(
            joinedload(ScheduleShare.schedule),
            joinedload(ScheduleShare.sharer)
        ).all()

    def share_token_exists(self, share_token: str) -> bool:
        """Check if a share token already exists"""
        return self.db.query(ScheduleShare).filter(
            ScheduleShare.share_token == share_token
        ).first() is not None