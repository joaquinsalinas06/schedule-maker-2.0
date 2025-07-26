"""
Schedule Generator Service
Adapted from the HTML/JS scheduler to generate all possible schedule combinations
"""

from typing import List, Dict, Optional, Set
from datetime import time, datetime
from sqlalchemy.orm import Session
from app.models import Course, Section, Session as SessionModel, Schedule
from app.schemas import ScheduleResponse
from app.repositories.course_repository import CourseRepository
from app.repositories.section_repository import SectionRepository
from app.repositories.session_repository import SessionRepository
import itertools


class CourseOption:
    """Represents a course section with its sessions"""
    
    def __init__(self, section: Section, sessions: List[SessionModel], course: Course):
        self.section_id = section.id
        self.course_id = course.id
        self.course_code = course.code
        self.course_name = course.name
        self.section_number = section.section_number
        self.credits = course.credits
        self.professor = section.professor
        self.sessions = sessions
        self.group = course.code  # Group by course code (same course, different sections)
        
    def collides_with(self, other: 'CourseOption') -> bool:
        """Check if this course option has time conflicts with another"""
        # Same course (same group) - can't take multiple sections of same course
        if self.group == other.group:
            return True
            
        # Check time overlaps
        for session1 in self.sessions:
            for session2 in other.sessions:
                if self._sessions_overlap(session1, session2):
                    return True
                    
        return False
    
    def _sessions_overlap(self, session1: SessionModel, session2: SessionModel) -> bool:
        """Check if two sessions have time conflicts"""
        # Check if they're on the same day
        if not self._days_overlap(session1.day, session2.day):
            return False
            
        # Check time overlap
        start1 = self._time_to_minutes(session1.start_time)
        end1 = self._time_to_minutes(session1.end_time)
        start2 = self._time_to_minutes(session2.start_time)
        end2 = self._time_to_minutes(session2.end_time)
        
        # Times overlap if one starts before the other ends and vice versa
        return not (end1 <= start2 or end2 <= start1)
    
    def _days_overlap(self, day1: str, day2: str) -> bool:
        """Check if two day strings overlap (e.g., 'Lunes' == 'Lunes')"""
        return day1.lower() == day2.lower()
    
    def _time_to_minutes(self, time_obj: time) -> int:
        """Convert time object to minutes since midnight"""
        return time_obj.hour * 60 + time_obj.minute


class ScheduleCombination:
    """Represents a valid combination of course options"""
    
    def __init__(self, course_options: List[CourseOption]):
        self.course_options = course_options
        self.total_credits = sum(opt.credits for opt in course_options)
        self.course_count = len(course_options)
        self.id_string = self._create_id_string()
        
    def _create_id_string(self) -> str:
        """Create unique identifier for this combination"""
        sorted_ids = sorted([opt.section_id for opt in self.course_options])
        return "_".join(map(str, sorted_ids))
    
    def is_valid_with(self, course_option: CourseOption) -> bool:
        """Check if this combination can accept another course option"""
        for existing_option in self.course_options:
            if existing_option.collides_with(course_option):
                return False
        return True
    
    def add_course(self, course_option: CourseOption) -> 'ScheduleCombination':
        """Create new combination with additional course"""
        new_options = self.course_options + [course_option]
        # Sort by section_id for consistency
        new_options.sort(key=lambda x: x.section_id)
        return ScheduleCombination(new_options)


class ScheduleGeneratorService:
    """Service to generate all possible schedule combinations"""
    
    def __init__(self, db: Session):
        self.db = db
        self.course_repo = CourseRepository(db)
        self.section_repo = SectionRepository(db)
        self.session_repo = SessionRepository(db)
    
    def generate_schedule_combinations_from_selected_sections(
        self,
        selected_section_ids: List[int],
        semester: str = "2024-2"
    ) -> List[Dict]:
        """
        Generate combinations from user-selected sections with mandatory course requirement.
        
        User selects specific sections they want → System ensures ALL courses are represented.
        
        Example:
        - User selects sections [1, 3, 5] from Course A and [7, 9] from Course B
        - Result: 6 combinations (3×2) where each combination has both courses
        """
        
        # Get course options for selected sections
        course_options = []
        
        for section_id in selected_section_ids:
            section = self.section_repo.get(section_id)
            if not section:
                continue
                
            course = self.course_repo.get(section.course_id)
            if not course:
                continue
                
            sessions = self.session_repo.get_by_section(section_id)
            
            if sessions:  # Only include sections with sessions
                course_options.append(CourseOption(section, sessions, course))
        
        if not course_options:
            return []
        
        # Generate combinations where ALL courses are mandatory
        all_combinations = self._generate_mandatory_course_combinations(course_options)
        
        # Convert to response format with UUIDs
        return [self._combination_to_dict_with_uuid(combo) for combo in all_combinations]
    
    def _generate_mandatory_course_combinations(self, course_options: List[CourseOption]) -> List[ScheduleCombination]:
        """
        Generate combinations where ALL selected sections are mandatory.
        
        Case 1: If user selects sections from different courses -> 1 combination with all sections (if no conflicts)
        Case 2: If user selects multiple sections from same course -> combinations of one section per course
        
        Example: User selects [section1_courseA, section2_courseA, section3_courseB]
        Result: [section1_courseA + section3_courseB, section2_courseA + section3_courseB]
        """
        
        # Group course options by course (same course, different sections)
        course_groups = {}
        for option in course_options:
            course_code = option.course_code
            if course_code not in course_groups:
                course_groups[course_code] = []
            course_groups[course_code].append(option)
        
        unique_courses = list(course_groups.keys())
        
        # Generate all combinations where we pick one section from each course
        import itertools
        
        all_combinations = []
        
        # Get all possible combinations (cartesian product of course sections)
        course_section_lists = [course_groups[course] for course in unique_courses]
        
        for combination_tuple in itertools.product(*course_section_lists):
            # Check if this combination has any time conflicts
            combination_list = list(combination_tuple)
            
            # Validate the combination (no time conflicts)
            is_valid = True
            for i, option1 in enumerate(combination_list):
                for j, option2 in enumerate(combination_list):
                    if i != j and option1.collides_with(option2):
                        is_valid = False
                        break
                if not is_valid:
                    break
            
            if is_valid:
                # Sort by section_id for consistency
                combination_list.sort(key=lambda x: x.section_id)
                all_combinations.append(ScheduleCombination(combination_list))
        
        return all_combinations
    
    
    def _combination_to_dict_with_uuid(self, combination: ScheduleCombination) -> Dict:
        """Convert combination to dictionary format with UUID"""
        import uuid
        
        return {
            "combination_id": str(uuid.uuid4()),  # Generate UUID for each combination
            "id_string": combination.id_string,   # Keep original for debugging
            "total_credits": combination.total_credits,
            "course_count": combination.course_count,
            "courses": [
                {
                    "course_id": opt.course_id,
                    "course_code": opt.course_code,
                    "course_name": opt.course_name,
                    "section_id": opt.section_id,
                    "section_number": opt.section_number,
                    "credits": opt.credits,
                    "professor": opt.professor,
                    "sessions": [
                        {
                            "session_id": session.id,
                            "session_type": session.session_type,
                            "day": session.day,
                            "start_time": session.start_time.strftime("%H:%M"),
                            "end_time": session.end_time.strftime("%H:%M"),
                            "location": session.location,
                            "modality": session.modality
                        }
                        for session in opt.sessions
                    ]
                }
                for opt in combination.course_options
            ]
        }