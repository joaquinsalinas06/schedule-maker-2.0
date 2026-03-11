from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from .base import BaseModel


class Curriculum(BaseModel):
    __tablename__ = "curricula"

    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=False, unique=True)
    year = Column(Integer, nullable=False)
    total_credits = Column(Integer, nullable=False)
    total_semesters = Column(Integer, nullable=False)

    # Relationships
    university = relationship("University", backref="curricula")
    courses = relationship("CurriculumCourse", back_populates="curriculum", cascade="all, delete-orphan")

    __table_args__ = (
        {'sqlite_autoincrement': True},
    )


class CurriculumCourse(BaseModel):
    __tablename__ = "curriculum_courses"

    curriculum_id = Column(Integer, ForeignKey("curricula.id", ondelete="CASCADE"), nullable=False)
    course_name = Column(String(255), nullable=False)
    semester = Column(Integer, nullable=False)
    credits = Column(Integer, nullable=False, default=0)
    is_elective = Column(Boolean, default=False)
    elective_group = Column(String(50), nullable=True)
    linked_course_id = Column(Integer, ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    curriculum = relationship("Curriculum", back_populates="courses")
    linked_course = relationship("Course", backref="curriculum_entries")
    prerequisites = relationship(
        "CurriculumPrerequisite",
        foreign_keys="CurriculumPrerequisite.curriculum_course_id",
        back_populates="course",
        cascade="all, delete-orphan"
    )
    dependents = relationship(
        "CurriculumPrerequisite",
        foreign_keys="CurriculumPrerequisite.prerequisite_course_id",
        back_populates="prerequisite_course"
    )

    __table_args__ = (
        {'sqlite_autoincrement': True},
    )


class CurriculumPrerequisite(BaseModel):
    __tablename__ = "curriculum_prerequisites"

    curriculum_course_id = Column(Integer, ForeignKey("curriculum_courses.id", ondelete="CASCADE"), nullable=False)
    prerequisite_course_id = Column(Integer, ForeignKey("curriculum_courses.id", ondelete="CASCADE"), nullable=True)
    prerequisite_type = Column(String(20), nullable=False, default="course")  # "course" or "credits"
    required_credits = Column(Integer, nullable=True)

    # Relationships
    course = relationship("CurriculumCourse", foreign_keys=[curriculum_course_id], back_populates="prerequisites")
    prerequisite_course = relationship("CurriculumCourse", foreign_keys=[prerequisite_course_id], back_populates="dependents")

    __table_args__ = (
        {'sqlite_autoincrement': True},
    )


class UserCurriculumProgress(BaseModel):
    __tablename__ = "user_curriculum_progress"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    curriculum_id = Column(Integer, ForeignKey("curricula.id", ondelete="CASCADE"), nullable=False)
    curriculum_course_id = Column(Integer, ForeignKey("curriculum_courses.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), nullable=False, default="pending")  # "completed", "in_progress", "pending"
    completed_at = Column(DateTime, nullable=True)
    grade = Column(String(10), nullable=True)

    # Relationships
    user = relationship("User", backref="curriculum_progress")
    curriculum = relationship("Curriculum")
    curriculum_course = relationship("CurriculumCourse")

    __table_args__ = (
        UniqueConstraint('user_id', 'curriculum_course_id', name='uq_user_curriculum_course'),
        {'sqlite_autoincrement': True},
    )
