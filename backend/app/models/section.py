from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel

class Section(BaseModel):
    __tablename__ = "sections"
    
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    section_number = Column(String(10), nullable=False)
    capacity = Column(Integer, default=30)
    enrolled = Column(Integer, default=0)
    waitlisted = Column(Integer, default=0)
    professor = Column(String(255))
    professor_email = Column(String(255))
    semester = Column(String(20))
    
    # Relationships
    course = relationship("Course", back_populates="sections")
    sessions = relationship("Session", back_populates="section", cascade="all, delete-orphan")
    schedule_sessions = relationship("ScheduleSession", back_populates="section")