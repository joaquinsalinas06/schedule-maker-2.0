from sqlalchemy import Column, String, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship
from .base import BaseModel

class Course(BaseModel):
    __tablename__ = "courses"
    
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    code = Column(String(20), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    department = Column(String(100))  # Will store career codes like 'CS', 'DS', 'BIO'
    academic_period_id = Column(Integer, ForeignKey("academic_periods.id"), nullable=True)

    # Relationships
    university = relationship("University", back_populates="courses")
    sections = relationship("Section", back_populates="course", cascade="all, delete-orphan")
    academic_period = relationship("AcademicPeriod", back_populates="courses")
    
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )