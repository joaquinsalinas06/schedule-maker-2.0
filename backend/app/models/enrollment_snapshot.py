from sqlalchemy import Column, Integer, ForeignKey, DateTime, String, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import BaseModel

class EnrollmentSnapshot(BaseModel):
    """
    Historical enrollment data tracking with timestamps

    Stores snapshots of section enrollment data at specific points in time
    for tracking enrollment trends and changes over time.
    """
    __tablename__ = "enrollment_snapshots"

    section_id = Column(Integer, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False)
    academic_period_id = Column(Integer, ForeignKey("academic_periods.id"), nullable=False)

    # Snapshot data (mirrors Section fields at time of snapshot)
    capacity = Column(Integer, nullable=False)
    enrolled = Column(Integer, nullable=False)
    waitlisted = Column(Integer, default=0)
    professor = Column(String(255))
    professor_email = Column(String(255))

    # Snapshot metadata
    snapshot_timestamp = Column(DateTime, default=func.now(), nullable=False)
    import_source = Column(String(50), default='csv_import')  # 'csv_import', 'user_upload', 'automated_scrape'

    # Relationships
    section = relationship("Section", back_populates="enrollment_snapshots")
    academic_period = relationship("AcademicPeriod", back_populates="enrollment_snapshots")

    __table_args__ = (
        Index('idx_snapshot_section_timestamp', 'section_id', 'snapshot_timestamp'),
        Index('idx_snapshot_period', 'academic_period_id'),
    )
