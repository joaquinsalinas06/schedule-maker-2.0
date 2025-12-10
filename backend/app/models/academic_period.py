from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from .base import BaseModel

class AcademicPeriod(BaseModel):
    """
    Academic period model for managing semesters/cycles (e.g., "25-2", "26-1")

    Only one period can be current (is_current=True) per university at a time.
    When switching periods, the previous period is automatically deactivated.
    """
    __tablename__ = "academic_periods"

    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    period_code = Column(String(20), nullable=False)  # "25-2", "26-1", etc.
    period_name = Column(String(100))  # "Fall 2025", "Spring 2026", optional
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    is_current = Column(Boolean, default=False)  # Only ONE can be current per university

    # Relationships
    university = relationship("University", back_populates="academic_periods")
    courses = relationship("Course", back_populates="academic_period")
    enrollment_snapshots = relationship("EnrollmentSnapshot", back_populates="academic_period")
    import_logs = relationship("ImportLog", back_populates="academic_period")

    __table_args__ = (
        UniqueConstraint('university_id', 'period_code', name='uix_university_period'),
    )
