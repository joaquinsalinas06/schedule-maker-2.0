from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from datetime import datetime
from app.models.import_log import ImportLog, ImportStatus
from app.repositories.base import BaseRepository

class ImportLogRepository(BaseRepository[ImportLog]):
    """Repository for import log operations"""

    def __init__(self, db: Session):
        super().__init__(db, ImportLog)

    def create_log(
        self,
        university_id: int,
        academic_period_id: Optional[int],
        import_type: str,
        source_file: Optional[str] = None,
        file_hash: Optional[str] = None
    ) -> ImportLog:
        """Create a new import log entry"""
        log_data = {
            "university_id": university_id,
            "academic_period_id": academic_period_id,
            "import_type": import_type,
            "status": ImportStatus.PENDING,
            "source_file": source_file,
            "file_hash": file_hash,
            "started_at": datetime.now(),
            "is_active": True
        }
        return self.create(log_data)

    def update_status(
        self,
        log_id: int,
        status: ImportStatus,
        error_message: Optional[str] = None,
        error_details: Optional[str] = None
    ):
        """Update import log status"""
        log = self.get(log_id)
        if not log:
            return None

        updates = {"status": status}

        # Set completion time for terminal states
        if status in [ImportStatus.COMPLETED, ImportStatus.FAILED, ImportStatus.PARTIAL]:
            updates["completed_at"] = datetime.now()

        if error_message:
            updates["error_message"] = error_message
        if error_details:
            updates["error_details"] = error_details

        return self.update(log, updates)

    def update_statistics(self, log_id: int, stats: dict):
        """Update import statistics"""
        log = self.get(log_id)
        if not log:
            return None

        return self.update(log, stats)

    def get_recent_logs(self, university_id: int, limit: int = 20) -> List[ImportLog]:
        """Get recent import logs for a university"""
        return self.db.query(ImportLog).filter(
            and_(
                ImportLog.university_id == university_id,
                ImportLog.is_active == True
            )
        ).order_by(desc(ImportLog.started_at)).limit(limit).all()
