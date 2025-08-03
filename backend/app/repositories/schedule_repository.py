from typing import List, Optional

from sqlalchemy.orm import Session, joinedload

from app.models.schedule import Schedule, ScheduleSession
from app.models.session import Session as SessionModel
from app.models.section import Section
from app.models.course import Course
from app.repositories.base import BaseRepository


class ScheduleRepository(BaseRepository[Schedule]):
    def __init__(self, db: Session):
        super().__init__(db, Schedule)

    def get_user_schedules(self, user_id: int) -> List[Schedule]:
        return self.db.query(Schedule).filter(
            Schedule.user_id == user_id,
            Schedule.is_active == True
        ).all()

    def get_user_schedule(self, schedule_id: int, user_id: int) -> Optional[Schedule]:
        return self.db.query(Schedule).filter(
            Schedule.id == schedule_id,
            Schedule.user_id == user_id,
            Schedule.is_active == True
        ).first()

    def get_by_id_and_user(self, schedule_id: int, user_id: int) -> Optional[Schedule]:
        """Get a schedule by ID that belongs to a specific user"""
        return self.db.query(Schedule).filter(
            Schedule.id == schedule_id,
            Schedule.user_id == user_id,
            Schedule.is_active == True
        ).first()

    def create_schedule(self, user_id: int, name: str, description: Optional[str], 
                       share_token: str) -> Schedule:
        schedule_data = {
            "user_id": user_id,
            "name": name,
            "description": description,
            "share_token": share_token
        }
        return self.create(schedule_data)

    def soft_delete_schedule(self, schedule: Schedule) -> Schedule:
        return self.update(schedule, {"is_active": False})

    def get_courses_for_university(self, university_id: int) -> List[Course]:
        """Get all courses with their sections and sessions for a university"""
        # Get courses that actually have sections
        courses_with_sections = self.db.query(Course).join(Section).filter(
            Course.university_id == university_id,
            Course.is_active == True,
            Section.is_active == True
        ).distinct().options(
            joinedload(Course.sections.and_(
                Section.is_active == True
            )).joinedload(Section.sessions.and_(
                SessionModel.is_active == True
            ))
        ).all()
        
        return courses_with_sections

    def get_sections_for_user_university(self, section_ids: List[int], university_id: int) -> List[Section]:
        """Verify sections belong to user's university and are active"""
        return self.db.query(Section).join(Course).filter(
            Section.id.in_(section_ids),
            Course.university_id == university_id,
            Section.is_active == True
        ).all()

    def get_sections_for_course(self, course_id: int, university_id: int) -> List[Section]:
        """Get all sections for a specific course"""
        return self.db.query(Section).join(Course).filter(
            Section.course_id == course_id,
            Course.university_id == university_id,
            Section.is_active == True
        ).all()

    def create_schedule_session(self, schedule_session_data: dict):
        """Create a schedule session relationship"""
        schedule_session = ScheduleSession(**schedule_session_data)
        self.db.add(schedule_session)
        self.db.commit()
        self.db.refresh(schedule_session)
        return schedule_session

    def find_course_by_code(self, course_code: str):
        """Find a course by its code"""
        return self.db.query(Course).filter(Course.code == course_code).first()

    def find_section_by_course_and_number(self, course_id: int, section_number: str):
        """Find a section by course ID and section number"""
        return self.db.query(Section).filter(
            Section.course_id == course_id,
            Section.section_number == section_number
        ).first()

    def find_sessions_by_section(self, section_id: int):
        """Find all sessions for a given section"""
        return self.db.query(SessionModel).filter(SessionModel.section_id == section_id).all()