from typing import List, Optional, Dict, Union
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

    def generate_schedule_combinations(self, request, user: User) -> Dict:
        """
        Generate all possible schedule combinations from selected sections.
        This method handles validation and business logic.
        """
        # Validate request
        if not request.selected_sections:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Must select at least one section"
            )
        
        try:
            # Use existing method with proper validation
            return self.generate_schedule_combinations_from_sections(
                user=user,
                selected_sections=request.selected_sections
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error generating combinations: {str(e)}"
            )

    def generate_schedule_combinations_from_sections(self, user: User, selected_sections: List[int]) -> Dict:
        """Generate all possible schedule combinations from selected sections (user picks specific sections)"""
        if not selected_sections:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Must select at least one section"
            )
        
        # Verify all sections belong to user's university and are active
        sections = self.schedule_repo.get_sections_for_user_university(
            selected_sections, user.university_id
        )
        
        if len(sections) != len(selected_sections):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Some sections not found or don't belong to your university"
            )
        
        # Use the schedule generator with mandatory course combinations
        all_combinations = self.schedule_generator.generate_schedule_combinations_from_selected_sections(
            selected_section_ids=selected_sections
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

    async def save_schedule_from_request(self, request, user: User) -> Dict:
        """
        Save a specific combination as a user's schedule from request object.
        This method handles validation and business logic for saving schedules.
        """
        # Validate request data
        if not request.name or len(request.name.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Schedule name is required"
            )
        
        # For sharing functionality, we need the combination data
        if not request.combination_id and not request.combination:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either combination_id or combination data is required"
            )
        
        try:
            # Generate a unique schedule UUID
            schedule_uuid = str(uuid.uuid4())
            
            # Create the schedule record
            new_schedule = self.schedule_repo.create_schedule(
                user_id=user.id,
                name=request.name.strip(),
                description=request.description.strip() if request.description else None,
                share_token=schedule_uuid
            )
            
            # If combination data is provided, save the course/section relationships
            if request.combination and request.combination.get('courses'):
                self._save_combination_to_schedule(new_schedule, request.combination)
            
            return {
                "schedule_id": new_schedule.id,
                "schedule_uuid": schedule_uuid,
                "combination_id": request.combination_id if request.combination_id else "shared",
                "name": new_schedule.name,
                "description": new_schedule.description
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error saving schedule: {str(e)}"
            )

    def _save_combination_to_schedule(self, schedule, combination_data):
        """Save combination courses and sessions to the schedule_sessions table"""
        if not combination_data or not combination_data.get('courses'):
            return
        
        for course_data in combination_data['courses']:
            # Find the course by code through the schedule repository
            course = self.schedule_repo.find_course_by_code(course_data['course_code'])
            if not course:
                continue
                
            # Find the section through the schedule repository
            section = self.schedule_repo.find_section_by_course_and_number(
                course.id, 
                course_data['section_number']
            )
            if not section:
                continue
                
            # Get all sessions for this section through the schedule repository
            sessions = self.schedule_repo.find_sessions_by_section(section.id)
            
            # Create schedule_session entries for each session
            for session in sessions:
                schedule_session_data = {
                    "schedule_id": schedule.id,
                    "session_id": session.id,
                    "section_id": section.id
                }
                self.schedule_repo.create_schedule_session(schedule_session_data)

    def save_schedule(self, user: User, schedule_data) -> Dict:
        """Save a specific combination as a user's schedule"""
        # Generate a unique schedule UUID
        schedule_uuid = str(uuid.uuid4())
        
        # Create the schedule record
        new_schedule = self.schedule_repo.create_schedule(
            user_id=user.id,
            name=schedule_data.name,
            description=schedule_data.description,
            share_token=schedule_uuid
        )
        
        return {
            "schedule_id": new_schedule.id,
            "schedule_uuid": schedule_uuid,
            "combination_id": schedule_data.combination_id
        }

    def get_user_schedules(self, user: User) -> List[Schedule]:
        """Get user's saved schedules with validation"""
        try:
            return self.schedule_repo.get_user_schedules(user.id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error retrieving user schedules: {str(e)}"
            )

    def delete_user_schedule(self, schedule_id: int, user: User) -> None:
        """Delete a user's schedule with proper validation and error handling"""
        # Validate schedule ID
        if schedule_id <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid schedule ID"
            )
        
        try:
            schedule = self.schedule_repo.get_user_schedule(schedule_id, user.id)
            
            if not schedule:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Schedule not found or does not belong to user"
                )
            
            self.schedule_repo.soft_delete_schedule(schedule)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error deleting schedule: {str(e)}"
            )

    def delete_schedule(self, user: User, schedule_id: int) -> None:
        """Delete a user's schedule (soft delete)"""
        schedule = self.schedule_repo.get_user_schedule(schedule_id, user.id)
        
        if not schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found"
            )
        
        self.schedule_repo.soft_delete_schedule(schedule)