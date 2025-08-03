from sqlalchemy import Column, String, Integer, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from .base import BaseModel

class Schedule(BaseModel):
    __tablename__ = "schedules"
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    is_favorite = Column(Boolean, default=False)
    is_public = Column(Boolean, default=False)
    share_token = Column(String(100), unique=True)
    
    # Relationships
    user = relationship("User", back_populates="schedules")
    schedule_sessions = relationship("ScheduleSession", back_populates="schedule", cascade="all, delete-orphan")

class ScheduleSession(BaseModel):
    __tablename__ = "schedule_sessions"
    
    schedule_id = Column(Integer, ForeignKey("schedules.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    
    # Relationships
    schedule = relationship("Schedule", back_populates="schedule_sessions")
    session = relationship("Session", back_populates="schedule_sessions")
    section = relationship("Section", back_populates="schedule_sessions")