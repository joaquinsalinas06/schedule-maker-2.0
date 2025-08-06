from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Boolean, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import BaseModel

class CollaborativeSession(BaseModel):
    __tablename__ = "collaborative_sessions"
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    university_id = Column(Integer, ForeignKey("universities.id", ondelete="CASCADE"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_code = Column(String(20), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    max_participants = Column(Integer, default=10)
    current_schedule_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    
    # Relationships
    university = relationship("University")
    creator = relationship("User", foreign_keys=[created_by])
    participants = relationship("SessionParticipant", back_populates="session", cascade="all, delete-orphan")
    schedule_comparisons = relationship("ScheduleComparison", back_populates="session", cascade="all, delete-orphan")
    course_selections = relationship("CollaborativeCourseSelection", cascade="all, delete-orphan")
    generated_schedules = relationship("GeneratedCollaborativeSchedule", cascade="all, delete-orphan")

class SessionParticipant(BaseModel):
    __tablename__ = "session_participants"
    
    session_id = Column(Integer, ForeignKey("collaborative_sessions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    role = Column(String(20), default='participant')  # 'creator', 'participant'
    
    # Relationships
    session = relationship("CollaborativeSession", back_populates="participants")
    user = relationship("User")

class ScheduleShare(BaseModel):
    __tablename__ = "schedule_shares"
    
    schedule_id = Column(Integer, ForeignKey("schedules.id", ondelete="CASCADE"), nullable=False)
    shared_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    shared_with = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)  # None means public
    share_token = Column(String(100), unique=True, nullable=False)
    permissions = Column(String(20), default='view')  # 'view', 'comment', 'edit'
    expires_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    
    # Relationships
    schedule = relationship("Schedule")
    sharer = relationship("User", foreign_keys=[shared_by])
    recipient = relationship("User", foreign_keys=[shared_with])

class ScheduleComparison(BaseModel):
    __tablename__ = "schedule_comparisons"
    
    session_id = Column(Integer, ForeignKey("collaborative_sessions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    schedule_id = Column(Integer, ForeignKey("schedules.id", ondelete="CASCADE"), nullable=False)
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    session = relationship("CollaborativeSession", back_populates="schedule_comparisons")
    user = relationship("User")
    schedule = relationship("Schedule")

class CollaborativeCourseSelection(BaseModel):
    __tablename__ = "collaborative_course_selections"
    
    session_id = Column(Integer, ForeignKey("collaborative_sessions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_code = Column(String(20), nullable=False)
    course_name = Column(String(255), nullable=False)
    section_code = Column(String(20), nullable=False)
    professor = Column(String(255))
    schedule_data = Column(JSON)  # Store complete section data
    selection_type = Column(String(20), nullable=False)  # 'shared' or 'individual'
    shared_with_users = Column(JSON)  # Array of user IDs for shared courses
    priority = Column(Integer, default=1)  # Priority for scheduling conflicts
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    
    # Relationships
    session = relationship("CollaborativeSession", back_populates="course_selections")
    user = relationship("User")

class GeneratedCollaborativeSchedule(BaseModel):
    __tablename__ = "generated_collaborative_schedules"
    
    session_id = Column(Integer, ForeignKey("collaborative_sessions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    schedule_data = Column(JSON)  # Complete schedule for this user
    shared_courses = Column(JSON)  # List of shared course selections
    individual_courses = Column(JSON)  # List of individual course selections
    conflicts = Column(JSON)  # Any scheduling conflicts
    generation_metadata = Column(JSON)  # Algorithm details, constraints, etc.
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    is_current = Column(Boolean, default=True)
    
    # Relationships
    session = relationship("CollaborativeSession", back_populates="generated_schedules")
    user = relationship("User")

