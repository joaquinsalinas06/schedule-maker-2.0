from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import BaseModel
import enum

class ImportStatus(str, enum.Enum):
    """Status of import job"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"

class ImportLog(BaseModel):
    """
    Track import jobs, success/failure, change counts

    Provides audit trail and monitoring for all course data imports.
    """
    __tablename__ = "import_logs"

    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    academic_period_id = Column(Integer, ForeignKey("academic_periods.id"), nullable=True)

    # Job metadata
    import_type = Column(String(50), nullable=False)  # 'csv_upload', 'automated_scrape', 'user_pdf'
    status = Column(Enum(ImportStatus), default=ImportStatus.PENDING)
    started_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime, nullable=True)

    # File metadata
    source_file = Column(String(500), nullable=True)  # Original filename or URL
    file_hash = Column(String(64), nullable=True)  # SHA-256 of file content

    # Statistics
    courses_processed = Column(Integer, default=0)
    sections_added = Column(Integer, default=0)
    sections_updated = Column(Integer, default=0)
    sections_deactivated = Column(Integer, default=0)
    sessions_added = Column(Integer, default=0)
    sessions_updated = Column(Integer, default=0)

    # Error tracking
    error_message = Column(Text, nullable=True)
    error_details = Column(Text, nullable=True)  # JSON with detailed errors

    # Relationships
    university = relationship("University", back_populates="import_logs")
    academic_period = relationship("AcademicPeriod", back_populates="import_logs")
