from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.academic_period import AcademicPeriod
from app.repositories.base import BaseRepository

class AcademicPeriodRepository(BaseRepository[AcademicPeriod]):
    """Repository for academic period operations"""

    def __init__(self, db: Session):
        super().__init__(db, AcademicPeriod)

    def get_current_period(self, university_id: int) -> Optional[AcademicPeriod]:
        """Get the current active academic period for a university"""
        return self.db.query(AcademicPeriod).filter(
            and_(
                AcademicPeriod.university_id == university_id,
                AcademicPeriod.is_current == True,
                AcademicPeriod.is_active == True
            )
        ).first()

    def get_by_code(self, university_id: int, period_code: str) -> Optional[AcademicPeriod]:
        """Get academic period by code and university"""
        return self.db.query(AcademicPeriod).filter(
            and_(
                AcademicPeriod.university_id == university_id,
                AcademicPeriod.period_code == period_code,
                AcademicPeriod.is_active == True
            )
        ).first()

    def set_current_period(self, period_id: int, university_id: int) -> Optional[AcademicPeriod]:
        """
        Set a period as current (deactivates all others for this university)

        Returns the activated period or None if not found
        """
        # Deactivate all other periods for this university
        self.db.query(AcademicPeriod).filter(
            AcademicPeriod.university_id == university_id
        ).update({"is_current": False})

        # Activate the specified period
        period = self.get(period_id)
        if period and period.university_id == university_id:
            period.is_current = True
            self.db.commit()
            return period
        return None

    def get_all_by_university(self, university_id: int) -> List[AcademicPeriod]:
        """Get all academic periods for a university, ordered by start date (newest first)"""
        return self.db.query(AcademicPeriod).filter(
            and_(
                AcademicPeriod.university_id == university_id,
                AcademicPeriod.is_active == True
            )
        ).order_by(AcademicPeriod.start_date.desc()).all()
