from sqlalchemy import Column, String, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship
from .base import BaseModel

class Course(BaseModel):
    __tablename__ = "courses"
    
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    code = Column(String(20), nullable=False)
    name = Column(String(255), nullable=False)
    credits = Column(Integer, default=3)
    description = Column(Text)
    department = Column(String(100))  # Will store career codes like 'CS', 'DS', 'BIO'
    semester = Column(String(50))     # Stores semester info like 'ciclo-1', 'ciclo-2', etc.
    level = Column(String(50))
    prerequisites = Column(Text)
    
    # Relationships
    university = relationship("University", back_populates="courses")
    sections = relationship("Section", back_populates="course", cascade="all, delete-orphan")
    
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )