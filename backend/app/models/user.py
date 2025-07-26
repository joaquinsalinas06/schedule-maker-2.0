from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from .base import BaseModel

class User(BaseModel):
    __tablename__ = "users"
    
    email = Column(String(255), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    student_id = Column(String(50))
    role = Column(String(20), default='student')
    is_verified = Column(Boolean, default=False)
    preferences = Column(Text)
    last_login = Column(DateTime)
    
    # Relationships
    university = relationship("University", back_populates="users")
    schedules = relationship("Schedule", back_populates="user", cascade="all, delete-orphan")