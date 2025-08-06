#!/usr/bin/env python3
"""
Enhanced CSV Import Script for Schedule Maker 2.0 with Hierarchical Session Support
Maintains compatibility with existing backend while fixing hierarchical parsing issues.

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
    """Enhanced CSV Importer with hierarchical session support"""
    
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
    
    def parse_schedule(self, schedule_str: str) -> Tuple[List[str], Optional[time], Optional[time]]:
        """Parse schedule string like 'Mar. 15:00 - 18:00' and return days, start_time, end_time"""
        if not schedule_str or pd.isna(schedule_str):
            return [], None, None
        
        schedule_str = str(schedule_str).strip()
        
        # Pattern: "Mar. 15:00 - 18:00" or "Lun. Mie. 10:00 - 12:00"
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
    
    def parse_csv_file(self, file_path: str) -> List[CourseImportData]:
        """Parse CSV file with hierarchical session grouping"""
        try:
            df = pd.read_csv(file_path, encoding='utf-8')
        except UnicodeDecodeError:
            df = pd.read_csv(file_path, encoding='latin-1')
        
        # Skip empty rows at the beginning
        df = df.dropna(how='all')
        
        print(f"✅ Successfully loaded CSV with {len(df)} rows")
        
        # First pass: collect all sessions by course
        course_sessions = defaultdict(list)
        course_names = {}
        
        for _, row in df.iterrows():
            # Extract basic course info
            course_code = str(row.get('Código Curso', '')).strip()
            course_name = str(row.get('Curso', '')).strip()
            
            if not course_code or not course_name:
                continue
            
            # Store course name
            course_names[course_code] = course_name
            
            section_num = str(row.get('Sección', '')).strip()
            if not section_num:
                continue
            
            # Extract session info
            session_group = str(row.get('Sesión Grupo', '')).strip()
            if not session_group:
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
            
            # Parse schedule
            horario = str(row.get('Horario', '')).strip()
            days, start_time, end_time = self.parse_schedule(horario)
            
            if not days or not start_time or not end_time:
                continue
            
            # Extract other fields
            modality = str(row.get('Modalidad', 'Presencial')).strip()
            frequency = str(row.get('Frecuencia', 'Semana General')).strip()
            location = str(row.get('Ubicación', '')).strip()
            
            # Create session data for each day
            for day in days:
                session_data = SessionImportData(
                    session_type=session_group,  # Store full session group name
                    day=day,
                    start_time=start_time,
                    end_time=end_time,
                    location=location,
                    building=self.extract_building(location),
                    room=self.extract_room(location),
                    modality=modality,
                    frequency=frequency
                )
                
                # Store session with metadata
                session_with_meta = {
                    'session': session_data,
                    'professor': professor,
                    'professor_email': professor_email,
                    'capacity': capacity,
                    'enrolled': enrolled,
                    'session_group': session_group,
                    'section_num': section_num
                }
                
                # Store all sessions by course for hierarchical processing
                course_sessions[course_code].append(session_with_meta)
        
        # Second pass: Create sections respecting original CSV structure
        result = []
        for course_code, all_sessions in course_sessions.items():
            course_name = course_names.get(course_code, 'Unknown Course')
            
            # Group sessions by original CSV section numbers
            sections = self.create_hierarchical_sections(all_sessions)
            
            # Extract department from course code
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
    
    def create_hierarchical_sections(self, all_sessions: List[dict]) -> List[SectionImportData]:
        """Create sections handling shared theory + separate combinations"""
        # Check if this course has the decimal pattern (TEORÍA X.XX)
        has_decimal_pattern = any(
            re.search(r'TEORÍA \d+\.\d+', session_meta['session_group']) 
            for session_meta in all_sessions
        )
        
        if has_decimal_pattern:
            return self._create_decimal_pattern_sections(all_sessions)
        else:
            return self._create_standard_sections(all_sessions)
    
    def _create_decimal_pattern_sections(self, all_sessions: List[dict]) -> List[SectionImportData]:
        """Handle courses with TEORÍA X.XX pattern (like Cálculo de una variable)"""
        # Group sessions by session type
        sessions_by_type = defaultdict(list)
        for session_meta in all_sessions:
            session_group = session_meta['session_group']
            sessions_by_type[session_group].append(session_meta)
        
        # Find main theory sessions and decimal theory sessions
        main_theory_sessions = {}  # "TEORÍA 1" -> [sessions]
        decimal_theory_sessions = {}  # "TEORÍA 1.01" -> [sessions]
        
        for session_group, sessions in sessions_by_type.items():
            if re.match(r'^TEORÍA \d+$', session_group):  # Main theory (TEORÍA 1, TEORÍA 2)
                main_theory_sessions[session_group] = sessions
            elif re.match(r'^TEORÍA \d+\.\d+$', session_group):  # Decimal theory (TEORÍA 1.01, TEORÍA 1.02)
                decimal_theory_sessions[session_group] = sessions
        
        # Create sections by combining main theory + decimal theory
        sections = []
        section_counter = 1
        
        for decimal_group, decimal_session_list in decimal_theory_sessions.items():
            # Extract the main number (e.g., "1" from "TEORÍA 1.01")
            match = re.match(r'^TEORÍA (\d+)\.\d+$', decimal_group)
            if not match:
                continue
            main_number = match.group(1)
            main_group = f"TEORÍA {main_number}"
            
            # Find corresponding main theory sessions
            main_session_list = main_theory_sessions.get(main_group, [])
            
            # Combine main theory + decimal theory into one section
            combined_sessions = []
            all_professors = set()
            all_emails = set()
            all_capacities = set()
            all_enrolled = set()
            
            # Add main theory sessions (shared lecture)
            for session_meta in main_session_list:
                combined_sessions.append(session_meta['session'])
                if session_meta['professor'] and session_meta['professor'] != "TBD":
                    all_professors.add(session_meta['professor'])
                if session_meta['professor_email']:
                    all_emails.add(session_meta['professor_email'])
                if session_meta['capacity']:
                    all_capacities.add(session_meta['capacity'])
                if session_meta['enrolled']:
                    all_enrolled.add(session_meta['enrolled'])
            
            # Add decimal theory sessions (discussion/recitation)
            for session_meta in decimal_session_list:
                combined_sessions.append(session_meta['session'])
                if session_meta['professor'] and session_meta['professor'] != "TBD":
                    all_professors.add(session_meta['professor'])
                if session_meta['professor_email']:
                    all_emails.add(session_meta['professor_email'])
                if session_meta['capacity']:
                    all_capacities.add(session_meta['capacity'])
                if session_meta['enrolled']:
                    all_enrolled.add(session_meta['enrolled'])
            
            # Create section with truncated professor info
            professor_list = ", ".join(sorted(all_professors)) if all_professors else "TBD"
            if len(professor_list) > 250:
                professor_list = professor_list[:247] + "..."
            
            email_list = ", ".join(sorted(all_emails)) if all_emails else ""
            if len(email_list) > 250:
                email_list = email_list[:247] + "..."
            
            section = SectionImportData(
                section_number=str(section_counter),
                capacity=max(all_capacities) if all_capacities else 30,
                enrolled=max(all_enrolled) if all_enrolled else 0,
                professor=professor_list,
                professor_email=email_list,
                sessions=combined_sessions
            )
            sections.append(section)
            section_counter += 1
        
        return sections
    
    def _create_standard_sections(self, all_sessions: List[dict]) -> List[SectionImportData]:
        """Handle standard courses (like Computación Gráfica)"""
        # Group sessions by the original section number from CSV
        sections_by_number = defaultdict(list)
        
        for session_meta in all_sessions:
            section_num = session_meta['section_num']
            sections_by_number[section_num].append(session_meta)
        
        # Create sections based on hierarchical patterns
        sections = []
        section_counter = 1
        
        for section_num, session_list in sections_by_number.items():
            # Group sessions by session type within this section
            sessions_by_type = defaultdict(list)
            for session_meta in session_list:
                session_group = session_meta['session_group']
                sessions_by_type[session_group].append(session_meta)
            
            # Find theory sessions and lab sessions
            theory_sessions = []
            lab_sessions = defaultdict(list)
            
            for session_group, sessions in sessions_by_type.items():
                if 'TEORÍA' in session_group:
                    theory_sessions.extend(sessions)
                elif 'LABORATORIO' in session_group:
                    # Group labs by their specific identifier (e.g., "1.01", "1.02")
                    lab_sessions[session_group].extend(sessions)
            
            # If we have theory + multiple lab groups, create separate sections
            if theory_sessions and len(lab_sessions) > 1:
                # Create one section for each lab combination with shared theory
                for lab_group, lab_session_list in lab_sessions.items():
                    combined_sessions = []
                    all_professors = set()
                    all_emails = set()
                    all_capacities = set()
                    all_enrolled = set()
                    
                    # Add theory sessions (shared)
                    for session_meta in theory_sessions:
                        combined_sessions.append(session_meta['session'])
                        if session_meta['professor'] and session_meta['professor'] != "TBD":
                            all_professors.add(session_meta['professor'])
                        if session_meta['professor_email']:
                            all_emails.add(session_meta['professor_email'])
                        if session_meta['capacity']:
                            all_capacities.add(session_meta['capacity'])
                        if session_meta['enrolled']:
                            all_enrolled.add(session_meta['enrolled'])
                    
                    # Add specific lab sessions
                    for session_meta in lab_session_list:
                        combined_sessions.append(session_meta['session'])
                        if session_meta['professor'] and session_meta['professor'] != "TBD":
                            all_professors.add(session_meta['professor'])
                        if session_meta['professor_email']:
                            all_emails.add(session_meta['professor_email'])
                        if session_meta['capacity']:
                            all_capacities.add(session_meta['capacity'])
                        if session_meta['enrolled']:
                            all_enrolled.add(session_meta['enrolled'])
                    
                    # Create section with truncated professor info
                    professor_list = ", ".join(sorted(all_professors)) if all_professors else "TBD"
                    if len(professor_list) > 250:
                        professor_list = professor_list[:247] + "..."
                    
                    email_list = ", ".join(sorted(all_emails)) if all_emails else ""
                    if len(email_list) > 250:
                        email_list = email_list[:247] + "..."
                    
                    section = SectionImportData(
                        section_number=str(section_counter),
                        capacity=max(all_capacities) if all_capacities else 30,
                        enrolled=max(all_enrolled) if all_enrolled else 0,
                        professor=professor_list,
                        professor_email=email_list,
                        sessions=combined_sessions
                    )
                    sections.append(section)
                    section_counter += 1
            else:
                # Standard case: aggregate all sessions for this section number
                all_professors = set()
                all_emails = set()
                all_capacities = set()
                all_enrolled = set()
                combined_sessions = []
                
                for session_meta in session_list:
                    combined_sessions.append(session_meta['session'])
                    if session_meta['professor'] and session_meta['professor'] != "TBD":
                        all_professors.add(session_meta['professor'])
                    if session_meta['professor_email']:
                        all_emails.add(session_meta['professor_email'])
                    if session_meta['capacity']:
                        all_capacities.add(session_meta['capacity'])
                    if session_meta['enrolled']:
                        all_enrolled.add(session_meta['enrolled'])
                
                # Create section with truncated professor info
                professor_list = ", ".join(sorted(all_professors)) if all_professors else "TBD"
                if len(professor_list) > 250:
                    professor_list = professor_list[:247] + "..."
                
                email_list = ", ".join(sorted(all_emails)) if all_emails else ""
                if len(email_list) > 250:
                    email_list = email_list[:247] + "..."
                
                section = SectionImportData(
                    section_number=section_num,  # Use original section number from CSV
                    capacity=max(all_capacities) if all_capacities else 30,
                    enrolled=max(all_enrolled) if all_enrolled else 0,
                    professor=professor_list,
                    professor_email=email_list,
                    sessions=combined_sessions
                )
                sections.append(section)
                section_counter += 1
        
        return sections
    
    def import_courses(self, courses_data: List[CourseImportData], university_id: int):
        """Import courses to database (maintains original interface)"""
        imported_count = 0
        
        for course_data in courses_data:
            try:
                # Check if course exists
                existing_course = self.course_repo.get_by_code_and_university(
                    course_data.code, university_id
                )
                
                if existing_course:
                    course = existing_course
                    print(f"📚 Course {course_data.code} already exists, updating...")
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
                    print(f"✅ Created course: {course_data.code} - {course_data.name}")
                
                # Import sections with hierarchical session support
                for section_data in course_data.sections:
                    existing_section = self.section_repo.get_by_course_and_number(
                        course.id, section_data.section_number
                    )
                    
                    if existing_section:
                        section = existing_section
                        print(f"  📝 Section {section_data.section_number} exists, updating sessions...")
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
                        print(f"  ✅ Created section {section_data.section_number} ({len(section_data.sessions)} sessions)")
                    
                    # Import all sessions with duplicate prevention
                    for session_data in section_data.sessions:
                        # Check if session already exists
                        existing_sessions = self.session_repo.get_by_section(section.id)
                        session_exists = False
                        
                        for existing_session in existing_sessions:
                            if (existing_session.session_type == session_data.session_type and
                                existing_session.day == session_data.day and
                                existing_session.start_time == session_data.start_time and
                                existing_session.end_time == session_data.end_time and
                                existing_session.location == session_data.location and
                                existing_session.modality == session_data.modality and
                                existing_session.is_active == True):
                                session_exists = True
                                break
                        
                        if not session_exists:
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
                        else:
                            print(f"    ⏭️  Session already exists: {session_data.day} {session_data.start_time}-{session_data.end_time}")
                
                imported_count += 1
                
            except Exception as e:
                print(f"❌ Error importing course {course_data.code}: {str(e)}")
                continue
        
        return imported_count


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/csv_import.py <csv_file_path> [university_id]")
        sys.exit(1)
    
    csv_file_path = sys.argv[1]
    university_id = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    
    if not os.path.exists(csv_file_path):
        print(f"❌ Error: CSV file '{csv_file_path}' not found")
        sys.exit(1)
    
    # Create database session
    db_session = SessionLocal()
    
    try:
        # Verify university exists
        university_repo = UniversityRepository(db_session)
        university = university_repo.get_by_id(university_id)
        
        if not university:
            print(f"❌ Error: University with ID {university_id} not found")
            sys.exit(1)
        
        print(f"🏫 Importing courses for university: {university.name}")
        
        # Initialize importer
        importer = CSVImporter(db_session)
        
        # Parse CSV file with hierarchical support
        print(f"📋 Parsing CSV file: {csv_file_path}")
        courses_data = importer.parse_csv_file(csv_file_path)
        
        # Show summary
        total_sections = sum(len(course.sections) for course in courses_data)
        total_sessions = sum(len(section.sessions) for course in courses_data for section in course.sections)
        
        print(f"📊 Parsing Summary:")
        print(f"  📚 Total courses: {len(courses_data)}")
        print(f"  📝 Total sections: {total_sections}")
        print(f"  📅 Total sessions: {total_sessions}")
        
        # Import courses
        print(f"🚀 Starting database import...")
        imported_count = importer.import_courses(courses_data, university_id)
        print(f"✅ Successfully imported {imported_count} courses with improved hierarchical structure!")
        
    except Exception as e:
        print(f"❌ Import failed: {str(e)}")
        db_session.rollback()
        sys.exit(1)
    
    finally:
        db_session.close()


if __name__ == "__main__":
    main()