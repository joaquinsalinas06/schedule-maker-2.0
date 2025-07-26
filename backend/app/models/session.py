from sqlalchemy import Column, String, Integer, ForeignKey, Time
from sqlalchemy.orm import relationship
from .base import BaseModel

class Session(BaseModel):
    __tablename__ = "sessions"
    
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False)
    session_type = Column(String(50), nullable=False)
    day = Column(String(10), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    location = Column(String(255))
    building = Column(String(100))
    room = Column(String(50))
    modality = Column(String(50), default='Presencial')
    frequency = Column(String(50), default='Semanal')
    
    # Relationships
    section = relationship("Section", back_populates="sessions")
    schedule_sessions = relationship("ScheduleSession", back_populates="session")