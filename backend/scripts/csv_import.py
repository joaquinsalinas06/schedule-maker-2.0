#!/usr/bin/env python3
"""
Consolidated CSV Import Script for Schedule Maker 2.0
Usage: python backend/scripts/csv_import.py <csv_file_path> [university_id]
"""

import sys
import os
import pandas as pd
import re
from datetime import time
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from pathlib import Path
from collections import defaultdict

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables using flexible configuration
from app.utils.config import load_environment
load_environment()

from app.database.connection import SessionLocal
from app.repositories.course_repository import CourseRepository
from app.repositories.section_repository import SectionRepository
from app.repositories.session_repository import SessionRepository
from app.repositories.university_repository import UniversityRepository


@dataclass
class SessionImportData:
    """Data structure for session import"""
    session_type: str
    day: str
    start_time: time
    end_time: time
    location: str
    building: str
    room: str
    modality: str
    frequency: str


@dataclass
class SectionImportData:
    """Data structure for section import"""
    section_number: str
    capacity: int
    enrolled: int
    professor: str
    professor_email: str
    sessions: List[SessionImportData]


@dataclass
class CourseImportData:
    """Data structure for course import"""
    code: str
    name: str
    department: str
    sections: List[SectionImportData]


class CSVImporter:
    """Consolidated CSV Importer for course data"""
    
    def __init__(self, db_session):
        self.db = db_session
        self.course_repo = CourseRepository(db_session)
        self.section_repo = SectionRepository(db_session)
        self.session_repo = SessionRepository(db_session)
        self.university_repo = UniversityRepository(db_session)
        
        # Day mapping from Spanish to English
        self.day_mapping = {
            'Lun': 'Monday', 'Mar': 'Tuesday', 'Mie': 'Wednesday',
            'Jue': 'Thursday', 'Vie': 'Friday', 'Sab': 'Saturday', 'Dom': 'Sunday'
        }
    
    def parse_time(self, time_str: str) -> Optional[time]:
        """Parse time string to time object"""
        if not time_str or pd.isna(time_str):
            return None
        
        try:
            # Handle different time formats
            time_str = str(time_str).strip()
            
            # Format: "14:00"
            if ':' in time_str:
                hour, minute = time_str.split(':')
                return time(int(hour), int(minute))
            
            # Format: "1400" (military time)
            elif len(time_str) == 4 and time_str.isdigit():
                hour = int(time_str[:2])
                minute = int(time_str[2:])
                return time(hour, minute)
                
        except ValueError:
            return None
        
        return None
    
    def parse_days(self, days_str: str) -> List[str]:
        """Parse days string and return list of English day names"""
        if not days_str or pd.isna(days_str):
            return []
        
        days = []
        days_str = str(days_str).strip()
        
        # Split by common separators and map to English
        for day_part in re.split(r'[,\s]+', days_str):
            day_part = day_part.strip()
            if day_part in self.day_mapping:
                days.append(self.day_mapping[day_part])
        
        return days
    
    def parse_schedule(self, schedule_str: str) -> Tuple[List[str], Optional[time], Optional[time]]:
        """Parse schedule string like 'Mar. 15:00 - 18:00' and return days, start_time, end_time"""
        if not schedule_str or pd.isna(schedule_str):
            return [], None, None
        
        schedule_str = str(schedule_str).strip()
        
        # Pattern: "Mar. 15:00 - 18:00" or "Lun. Mie. 10:00 - 12:00"
        # Split by time pattern to separate days from times
        time_pattern = r'(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})'
        time_match = re.search(time_pattern, schedule_str)
        
        if not time_match:
            return [], None, None
        
        start_time_str = time_match.group(1)
        end_time_str = time_match.group(2)
        
        # Parse times
        start_time = self.parse_time(start_time_str)
        end_time = self.parse_time(end_time_str)
        
        if not start_time or not end_time:
            return [], None, None
        
        # Extract days part (everything before the time)
        days_part = schedule_str[:time_match.start()].strip()
        
        # Parse days with Spanish abbreviations
        spanish_days = {
            'Lun': 'Monday', 'Mar': 'Tuesday', 'Mie': 'Wednesday', 'Mié': 'Wednesday',
            'Jue': 'Thursday', 'Vie': 'Friday', 'Sab': 'Saturday', 'Dom': 'Sunday'
        }
        
        days = []
        for day_abbr in re.findall(r'[A-ZÁÉÍÓÚáéíóú][a-záéíóú]+', days_part):
            day_abbr = day_abbr.strip('.')
            if day_abbr in spanish_days:
                days.append(spanish_days[day_abbr])
        
        return days, start_time, end_time
    
    def extract_building(self, location: str) -> str:
        """Extract building from location string like 'UTEC-BA A602(23)'"""
        if not location:
            return ""
        
        # Pattern to extract building part before the room
        match = re.match(r'^([^A-Z0-9]*[A-Z\-]+)', location)
        if match:
            return match.group(1).strip()
        
        return ""
    
    def extract_room(self, location: str) -> str:
        """Extract room from location string like 'UTEC-BA A602(23)'"""
        if not location:
            return ""
        
        # Pattern to extract room part after building
        match = re.search(r'([A-Z]\d+)', location)
        if match:
            return match.group(1)
        
        return ""

    def extract_course_code(self, course_str: str) -> Tuple[str, str]:
        """Extract course code and name from course string"""
        if not course_str or pd.isna(course_str):
            return "", ""
        
        course_str = str(course_str).strip()
        
        # Pattern: "CS101 - Introduction to Computer Science"
        match = re.match(r'^([A-Z]{2,4}\d{3,4})\s*[-–]\s*(.+)$', course_str)
        if match:
            return match.group(1), match.group(2).strip()
        
        # Pattern: "CS101 Introduction to Computer Science"
        match = re.match(r'^([A-Z]{2,4}\d{3,4})\s+(.+)$', course_str)
        if match:
            return match.group(1), match.group(2).strip()
        
        # Just course code
        if re.match(r'^[A-Z]{2,4}\d{3,4}$', course_str):
            return course_str, ""
        
        return "", course_str
    
    def parse_csv_file(self, file_path: str) -> List[CourseImportData]:
        """Parse CSV file and return course data"""
        try:
            df = pd.read_csv(file_path, encoding='utf-8')
        except UnicodeDecodeError:
            df = pd.read_csv(file_path, encoding='latin-1')
        
        # Skip empty rows at the beginning
        df = df.dropna(how='all')
        
        courses_data = defaultdict(lambda: defaultdict(list))
        
        for _, row in df.iterrows():
            # Extract basic course info using actual CSV column names
            course_code = str(row.get('Código Curso', '')).strip()
            course_name = str(row.get('Curso', '')).strip()
            
            if not course_code or not course_name:
                continue
            
            section_num = str(row.get('Sección', '')).strip()
            if not section_num:
                continue
            
            # Extract professor info
            professor = str(row.get('Docente', 'TBD')).strip()
            professor_email = str(row.get('Correo', '')).strip()
            
            # Extract capacity and enrollment
            try:
                capacity = int(row.get('Vacantes', 30))
                enrolled = int(row.get('Matriculados', 0))
            except (ValueError, TypeError):
                capacity = 30
                enrolled = 0
            
            # Parse schedule info from 'Horario' field (e.g., "Mar. 15:00 - 18:00")
            horario = str(row.get('Horario', '')).strip()
            days, start_time, end_time = self.parse_schedule(horario)
            
            if not days or not start_time or not end_time:
                continue
            
            # Extract session type from 'Sesión Grupo'
            session_type = str(row.get('Sesión Grupo', 'TEORÍA')).strip()
            
            # Extract other fields
            modality = str(row.get('Modalidad', 'Presencial')).strip()
            frequency = str(row.get('Frecuencia', 'Semana General')).strip()
            location = str(row.get('Ubicación', '')).strip()
            
            # Create session data for each day
            for day in days:
                session_data = SessionImportData(
                    session_type=session_type,
                    day=day,
                    start_time=start_time,
                    end_time=end_time,
                    location=location,
                    building=self.extract_building(location),
                    room=self.extract_room(location),
                    modality=modality,
                    frequency=frequency
                )
                
                courses_data[course_code][(section_num, course_name, professor, professor_email, capacity, enrolled)].append(session_data)
        
        # Convert to CourseImportData objects
        result = []
        for course_code, sections_dict in courses_data.items():
            sections = []
            course_name = ""
            
            for (section_num, name, prof, prof_email, capacity, enrolled), sessions in sections_dict.items():
                course_name = name or course_name
                
                section_data = SectionImportData(
                    section_number=section_num,
                    capacity=capacity,
                    enrolled=enrolled,
                    professor=prof or "TBD",
                    professor_email=prof_email or "",
                    sessions=sessions
                )
                sections.append(section_data)
            
            # Extract department from course code (first 2-4 letters)
            department = re.match(r'^([A-Z]{2,4})', course_code)
            department = department.group(1) if department else "UNKNOWN"
            
            course_data = CourseImportData(
                code=course_code,
                name=course_name,
                department=department,
                sections=sections
            )
            result.append(course_data)
        
        return result
    
    def import_courses(self, courses_data: List[CourseImportData], university_id: int):
        """Import courses to database"""
        imported_count = 0
        
        for course_data in courses_data:
            try:
                # Check if course exists
                existing_course = self.course_repo.get_by_code_and_university(
                    course_data.code, university_id
                )
                
                if existing_course:
                    course = existing_course
                    print(f"Course {course_data.code} already exists, updating...")
                else:
                    # Create new course
                    course_dict = {
                        "code": course_data.code,
                        "name": course_data.name,
                        "department": course_data.department,
                        "university_id": university_id,
                        "is_active": True
                    }
                    course = self.course_repo.create(course_dict)
                    print(f"Created course: {course_data.code} - {course_data.name}")
                
                # Import sections
                for section_data in course_data.sections:
                    existing_section = self.section_repo.get_by_course_and_number(
                        course.id, section_data.section_number
                    )
                    
                    if existing_section:
                        section = existing_section
                    else:
                        section_dict = {
                            "section_number": section_data.section_number,
                            "capacity": section_data.capacity,
                            "enrolled": section_data.enrolled,
                            "professor": section_data.professor,
                            "professor_email": section_data.professor_email,
                            "course_id": course.id,
                            "is_active": True
                        }
                        section = self.section_repo.create(section_dict)
                    
                    # Import sessions
                    for session_data in section_data.sessions:
                        session_dict = {
                            "session_type": session_data.session_type,
                            "day": session_data.day,
                            "start_time": session_data.start_time,
                            "end_time": session_data.end_time,
                            "location": session_data.location,
                            "building": session_data.building,
                            "room": session_data.room,
                            "modality": session_data.modality,
                            "frequency": session_data.frequency,
                            "section_id": section.id,
                            "is_active": True
                        }
                        self.session_repo.create(session_dict)
                
                imported_count += 1
                
            except Exception as e:
                print(f"Error importing course {course_data.code}: {str(e)}")
                continue
        
        return imported_count


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/csv_import.py <csv_file_path> [university_id]")
        sys.exit(1)
    
    csv_file_path = sys.argv[1]
    university_id = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    
    if not os.path.exists(csv_file_path):
        print(f"Error: CSV file '{csv_file_path}' not found")
        sys.exit(1)
    
    # Create database session
    db_session = SessionLocal()
    
    try:
        # Verify university exists
        university_repo = UniversityRepository(db_session)
        university = university_repo.get_by_id(university_id)
        
        if not university:
            print(f"Error: University with ID {university_id} not found")
            sys.exit(1)
        
        print(f"Importing courses for university: {university.name}")
        
        # Initialize importer
        importer = CSVImporter(db_session)
        
        # Parse CSV file
        print(f"Parsing CSV file: {csv_file_path}")
        courses_data = importer.parse_csv_file(csv_file_path)
        print(f"Found {len(courses_data)} courses to import")
        
        # Import courses
        imported_count = importer.import_courses(courses_data, university_id)
        print(f"Successfully imported {imported_count} courses")
        
    except Exception as e:
        print(f"Import failed: {str(e)}")
        db_session.rollback()
        sys.exit(1)
    
    finally:
        db_session.close()


if __name__ == "__main__":
    main()