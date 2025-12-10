from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from datetime import datetime
from app.models.enrollment_snapshot import EnrollmentSnapshot
from app.repositories.base import BaseRepository

class EnrollmentSnapshotRepository(BaseRepository[EnrollmentSnapshot]):
    """Repository for enrollment snapshot operations"""

    def __init__(self, db: Session):
        super().__init__(db, EnrollmentSnapshot)

    def create_snapshot(
        self,
        section_id: int,
        academic_period_id: int,
        capacity: int,
        enrolled: int,
        waitlisted: int,
        professor: str,
        professor_email: str,
        import_source: str = 'csv_import'
    ) -> EnrollmentSnapshot:
        """Create a new enrollment snapshot"""
        snapshot_data = {
            "section_id": section_id,
            "academic_period_id": academic_period_id,
            "capacity": capacity,
            "enrolled": enrolled,
            "waitlisted": waitlisted,
            "professor": professor,
            "professor_email": professor_email,
            "snapshot_timestamp": datetime.now(),
            "import_source": import_source,
            "is_active": True
        }
        return self.create(snapshot_data)

    def get_section_history(self, section_id: int, limit: int = 50) -> List[EnrollmentSnapshot]:
        """Get enrollment history for a section, ordered by timestamp descending"""
        return self.db.query(EnrollmentSnapshot).filter(
            and_(
                EnrollmentSnapshot.section_id == section_id,
                EnrollmentSnapshot.is_active == True
            )
        ).order_by(desc(EnrollmentSnapshot.snapshot_timestamp)).limit(limit).all()

    def get_latest_snapshot(self, section_id: int, academic_period_id: int) -> EnrollmentSnapshot:
        """Get the most recent snapshot for a section in a period"""
        return self.db.query(EnrollmentSnapshot).filter(
            and_(
                EnrollmentSnapshot.section_id == section_id,
                EnrollmentSnapshot.academic_period_id == academic_period_id,
                EnrollmentSnapshot.is_active == True
            )
        ).order_by(desc(EnrollmentSnapshot.snapshot_timestamp)).first()

    def bulk_create_snapshots(self, snapshots: List[dict]) -> int:
        """
        Batch create multiple snapshots for performance

        Returns the number of snapshots created
        """
        snapshot_objects = [EnrollmentSnapshot(**snapshot) for snapshot in snapshots]
        self.db.bulk_save_objects(snapshot_objects)
        self.db.commit()
        return len(snapshot_objects)
