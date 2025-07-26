from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from app.models.schedule import Schedule
from app.models.course import Course
from app.models.section import Section
from app.models.session import Session as SessionModel
from app.models.user import User
from app.repositories.schedule_repository import ScheduleRepository
from app.repositories.session_repository import SessionRepository
from app.services.schedule_generator import ScheduleGeneratorService
from fastapi import HTTPException, status
import uuid


class ScheduleService:
    def __init__(self, db: Session):
        self.schedule_repo = ScheduleRepository(db)
        self.session_repo = SessionRepository(db)
        self.schedule_generator = ScheduleGeneratorService(db)

    def get_available_courses_for_user(self, user: User, semester: str = "2024-2") -> List[Dict]:
        """Get all courses available for user's university with their sections"""
        courses = self.schedule_repo.get_courses_for_university(user.university_id, semester)
        
        result = []
        for course in courses:
            sections_data = []
            for section in course.sections:
                if section.semester == semester and section.is_active:
                    sessions_data = [
                        {
                            "session_id": session.id,
                            "session_type": session.session_type,
                            "day": session.day,
                            "start_time": session.start_time.strftime("%H:%M"),
                            "end_time": session.end_time.strftime("%H:%M"),
                            "location": session.location,
                            "modality": session.modality
                        }
                        for session in section.sessions if session.is_active
                    ]
                    
                    sections_data.append({
                        "section_id": section.id,
                        "section_number": section.section_number,
                        "professor": section.professor,
                        "capacity": section.capacity,
                        "enrolled": section.enrolled,
                        "sessions": sessions_data
                    })
            
            if sections_data:  # Only include courses that have sections
                result.append({
                    "course_id": course.id,
                    "course_code": course.code,
                    "course_name": course.name,
                    "credits": course.credits,
                    "department": course.department or "General",
                    "sections": sections_data
                })
        
        return result

    def generate_schedule_combinations_from_sections(self, user: User, selected_sections: List[int],
                                                   semester: str = "2024-2") -> Dict:
        """Generate all possible schedule combinations from selected sections (user picks specific sections)"""
        if not selected_sections:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Must select at least one section"
            )
        
        # Verify all sections belong to user's university and are active
        sections = self.schedule_repo.get_sections_for_user_university(
            selected_sections, user.university_id, semester
        )
        
        if len(sections) != len(selected_sections):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Some sections not found or don't belong to your university"
            )
        
        # Use the schedule generator with mandatory course combinations
        all_combinations = self.schedule_generator.generate_schedule_combinations_from_selected_sections(
            selected_section_ids=selected_sections,
            semester=semester
        )
        
        # Count unique courses
        unique_courses = set()
        for section in sections:
            unique_courses.add(section.course_id)
        
        return {
            "combinations": all_combinations,
            "total_combinations": len(all_combinations),
            "selected_courses_count": len(unique_courses)
        }


    def save_schedule(self, user: User, combination_id: str, name: str, 
                     description: Optional[str] = None, semester: str = "2024-2") -> Dict:
        """Save a specific combination as a user's schedule"""
        # Generate a unique schedule UUID
        schedule_uuid = str(uuid.uuid4())
        
        # Create the schedule record
        new_schedule = self.schedule_repo.create_schedule(
            user_id=user.id,
            name=name,
            description=description,
            semester=semester,
            share_token=schedule_uuid
        )
        
        return {
            "schedule_id": new_schedule.id,
            "schedule_uuid": schedule_uuid,
            "combination_id": combination_id
        }

    def get_user_schedules(self, user: User) -> List[Schedule]:
        """Get user's saved schedules"""
        return self.schedule_repo.get_user_schedules(user.id)

    def delete_schedule(self, user: User, schedule_id: int) -> None:
        """Delete a user's schedule (soft delete)"""
        schedule = self.schedule_repo.get_user_schedule(schedule_id, user.id)
        
        if not schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found"
            )
        
        self.schedule_repo.soft_delete_schedule(schedule)