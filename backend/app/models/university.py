from sqlalchemy import Column, String, Text
from sqlalchemy.orm import relationship
from .base import BaseModel

class University(BaseModel):
    __tablename__ = "universities"
    
    name = Column(String(255), nullable=False, unique=True)
    short_name = Column(String(50), nullable=False, unique=True)
    time_format = Column(String(20), default='hours')
    semester_info = Column(Text)
    parsing_config = Column(Text)
    
    # Relationships
    courses = relationship("Course", back_populates="university")
    users = relationship("User", back_populates="university")
    academic_periods = relationship("AcademicPeriod", back_populates="university")
    parser_configuration = relationship("ParserConfiguration", back_populates="university", uselist=False)
    import_logs = relationship("ImportLog", back_populates="university")