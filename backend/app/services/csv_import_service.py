import pandas as pd
import re
from datetime import time
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from collections import defaultdict

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
    credits: int
    semester: str
    sections: List[SectionImportData]


class CSVImportService:
    """Service for importing courses from CSV files"""
    
    def __init__(self, db: Session):
        self.db = db
        self.course_repo = CourseRepository(db)
        self.section_repo = SectionRepository(db)
        self.session_repo = SessionRepository(db)
        self.university_repo = UniversityRepository(db)
        
        # Day mapping from Spanish to English
        self.day_mapping = {
            'Lun': 'Monday', 'Mar': 'Tuesday', 'Mie': 'Wednesday',
            'Jue': 'Thursday', 'Vie': 'Friday', 'Sab': 'Saturday', 'Dom': 'Sunday'
        }
        
        # Statistics tracking
        self.stats = {
            'courses_processed': 0,
            'sections_created': 0,
            'sessions_created': 0,
            'errors': [],
            'warnings': [],
            'skipped_courses': []
        }

    def parse_schedule(self, horario: str) -> Optional[Tuple[str, time, time]]:
        """
        Parse schedule format: 'Mie. 09:00 - 11:00' -> ('Wednesday', time(9,0), time(11,0))
        """
        if not horario or pd.isna(horario):
            return None
        
        try:
            # Clean input
            horario = str(horario).strip()
            
            # Try multiple patterns to handle variations
            patterns = [
                r'(\w+)\.\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})',  # Standard
                r'(\w+)\s+(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})',    # Without dot
            ]
            
            for pattern in patterns:
                match = re.match(pattern, horario)
                if match:
                    day, start_hour, start_min, end_hour, end_min = match.groups()
                    
                    # Validate day
                    day_english = self.day_mapping.get(day)
                    if not day_english:
                        continue
                    
                    # Create time objects
                    start_time_obj = time(int(start_hour), int(start_min))
                    end_time_obj = time(int(end_hour), int(end_min))
                    
                    # Validate time sequence
                    if start_time_obj >= end_time_obj:
                        continue
                        
                    return day_english, start_time_obj, end_time_obj
            
            return None
            
        except (ValueError, TypeError) as e:
            self.stats['warnings'].append(f"Error parsing schedule '{horario}': {e}")
            return None

    def extract_location_info(self, ubicacion: str) -> Tuple[str, str, str]:
        """
        Extract location info: 'UTEC-BA A907(48)' -> (location, building, room)
        """
        if not ubicacion or pd.isna(ubicacion):
            return "", "", ""
        
        ubicacion = str(ubicacion).strip()
        
        try:
            # Pattern: UTEC-BA A907(48)
            pattern1 = r'(UTEC-\w+)\s+([A-Z]\d+)\((\d+)\)'
            match = re.match(pattern1, ubicacion)
            
            if match:
                building, room, capacity = match.groups()
                return ubicacion, building, room
            
            # Alternative pattern: UTEC A907
            pattern2 = r'(UTEC-?\w*)\s+([A-Z]\d+)'
            match = re.match(pattern2, ubicacion)
            
            if match:
                building, room = match.groups()
                return ubicacion, building, room
            
            # Return as is if no pattern matches
            return ubicacion, "", ""
            
        except Exception:
            return ubicacion, "", ""

    def determine_session_type(self, session_group: str) -> str:
        """
        Determine session type from 'Sesión Grupo' field
        """
        if not session_group:
            return "Other"
        
        session_group = str(session_group).upper()
        
        if 'TEORÍA' in session_group or 'TEORIA' in session_group:
            return 'Theory'
        elif 'LABORATORIO' in session_group or 'LAB' in session_group:
            return 'Laboratory'
        elif 'PRÁCTICA' in session_group or 'PRACTICA' in session_group:
            return 'Practice'
        elif 'TALLER' in session_group:
            return 'Workshop'
        elif 'SEMINARIO' in session_group:
            return 'Seminar'
        
        return 'Other'

    def extract_department(self, course_code: str) -> str:
        """Extract department from course code"""
        if not course_code:
            return "UNKNOWN"
        
        match = re.match(r'^([A-Z]+)', course_code.strip())
        return match.group(1) if match else "UNKNOWN"

    def group_sessions_into_sections(self, course_sessions: List[Dict]) -> Dict[str, List[Dict]]:
        """
        Group CSV rows into logical sections following UTEC patterns
        """
        sections = defaultdict(list)
        csv_sections = defaultdict(list)
        
        # Group by CSV section number first
        for session in course_sessions:
            csv_section = str(session.get('Sección', '1')).strip()
            csv_sections[csv_section].append(session)
        
        # Process each CSV section
        for csv_section_num, sessions in csv_sections.items():
            session_groups = defaultdict(list)
            
            for session in sessions:
                session_group = str(session.get('Sesión Grupo', '')).strip()
                session_groups[session_group].append(session)
            
            # Analyze session types
            theory_groups = []
            lab_groups = []
            other_groups = []
            
            for session_group, group_sessions in session_groups.items():
                if 'TEORÍA' in session_group.upper():
                    theory_groups.append((session_group, group_sessions))
                elif 'LABORATORIO' in session_group.upper():
                    lab_groups.append((session_group, group_sessions))
                else:
                    other_groups.append((session_group, group_sessions))
            
            # Apply grouping logic based on UTEC patterns
            if len(theory_groups) == 1 and len(lab_groups) > 1:
                # Pattern 1: One shared theory class + multiple lab sections (Programación)
                # Each lab group becomes a separate section sharing the theory
                theory_sessions = theory_groups[0][1]  # Get the theory sessions
                
                for lab_group, lab_sessions in lab_groups:
                    # Extract section number from lab group (e.g., "LABORATORIO 1.02" -> "1.02")
                    lab_match = re.search(r'LABORATORIO\s+(\d+\.\d+)', lab_group.upper())
                    if lab_match:
                        section_key = lab_match.group(1)
                    else:
                        # Fallback: use original section number with lab index
                        lab_index = lab_groups.index((lab_group, lab_sessions)) + 1
                        section_key = f"{csv_section_num}.{lab_index:02d}"
                    
                    # Combine theory + lab sessions for this section
                    combined_sessions = theory_sessions + lab_sessions
                    sections[section_key] = combined_sessions
                    
            elif len(theory_groups) > 1:
                # Pattern 2: Multiple theory classes that need to be paired (Cálculo)
                # Look for base theory + specific theories pattern
                base_theory = None
                specific_theories = []
                
                for theory_group, theory_sessions in theory_groups:
                    theory_name = theory_group.upper()
                    # Check if this is a base theory (e.g., "TEORÍA 1" without decimal suffix)
                    if re.match(r'TEORÍA\s+\d+$', theory_name):
                        base_theory = (theory_group, theory_sessions)
                    # Check if this is a specific theory (e.g., "TEORÍA 1.01", "TEORÍA 1.02")
                    elif re.search(r'TEORÍA\s+\d+\.\d+', theory_name):
                        specific_theories.append((theory_group, theory_sessions))
                
                if base_theory and specific_theories:
                    # Combine base theory with each specific theory
                    base_sessions = base_theory[1]
                    
                    for specific_group, specific_sessions in specific_theories:
                        # Extract section number from specific theory (e.g., "TEORÍA 1.02" -> "1.02")
                        section_match = re.search(r'TEORÍA\s+(\d+\.\d+)', specific_group.upper())
                        if section_match:
                            section_key = section_match.group(1)
                        else:
                            # Fallback
                            specific_index = specific_theories.index((specific_group, specific_sessions)) + 1
                            section_key = f"{csv_section_num}.{specific_index:02d}"
                        
                        # Combine base theory + specific theory sessions
                        combined_sessions = base_sessions + specific_sessions
                        sections[section_key] = combined_sessions
                else:
                    # Fallback: treat each theory as separate section
                    for i, (session_group, group_sessions) in enumerate(theory_groups):
                        section_key = f"{csv_section_num}.{i+1:02d}"
                        sections[section_key] = group_sessions
                        
            elif len(theory_groups) == 1 and len(lab_groups) <= 1:
                # Simple case: one theory + optional single lab = one section
                all_sessions = []
                for _, group_sessions in theory_groups + lab_groups + other_groups:
                    all_sessions.extend(group_sessions)
                sections[csv_section_num] = all_sessions
                    
            elif len(theory_groups) > 1 and not lab_groups:
                # Multiple theories without labs -> each theory is a subsection
                for i, (session_group, group_sessions) in enumerate(theory_groups):
                    section_key = f"{csv_section_num}.{i+1:02d}"
                    sections[section_key] = group_sessions
                    
            else:
                # Complex case: keep original grouping
                all_sessions = []
                for group_sessions in session_groups.values():
                    all_sessions.extend(group_sessions)
                sections[csv_section_num] = all_sessions
        
        return dict(sections)

    def create_session_data(self, session_dict: Dict) -> Optional[SessionImportData]:
        """Create SessionImportData from dictionary"""
        try:
            # Parse schedule
            schedule_info = self.parse_schedule(session_dict.get('Horario', ''))
            if not schedule_info:
                return None
            
            day, start_time, end_time = schedule_info
            
            # Extract location
            location, building, room = self.extract_location_info(session_dict.get('Ubicación', ''))
            
            # Determine session type
            session_group = session_dict.get('Sesión Grupo', '')
            session_type = self.determine_session_type(session_group)
            
            return SessionImportData(
                session_type=session_type,
                day=day,
                start_time=start_time,
                end_time=end_time,
                location=location,
                building=building,
                room=room,
                modality=session_dict.get('Modalidad', 'Presencial'),
                frequency=session_dict.get('Frecuencia', 'Semanal')
            )
            
        except Exception as e:
            self.stats['errors'].append(f"Error creating SessionImportData: {e}")
            return None

    def create_section_data(self, section_sessions: List[Dict], section_number: str) -> Optional[SectionImportData]:
        """Create SectionImportData from list of sessions"""
        try:
            if not section_sessions:
                return None
            
            # Find the theory session to use as the main section info
            theory_session = None
            for session_dict in section_sessions:
                session_group = str(session_dict.get('Sesión Grupo', '')).upper()
                if 'TEORÍA' in session_group:
                    theory_session = session_dict
                    break
            
            # If no theory session found, use first session
            main_session = theory_session if theory_session else section_sessions[0]
            
            # Create sessions
            sessions = []
            for session_dict in section_sessions:
                session_data = self.create_session_data(session_dict)
                if session_data:
                    sessions.append(session_data)
            
            if not sessions:
                return None
            
            # Collect all unique professors from all sessions
            professors = set()
            for session_dict in section_sessions:
                professor = str(session_dict.get('Docente', '')).strip()
                if professor:
                    professors.add(professor)
            
            # Format professor names
            if not professors:
                professor_display = "El profesor aún no ha sido definido"
            elif len(professors) == 1:
                professor_display = list(professors)[0]
            else:
                # Sort professors to ensure consistent ordering
                professor_list = sorted(list(professors))
                professor_display = " y ".join(professor_list)
            
            # Use theory professor for email if available
            theory_professor = str(main_session.get('Docente', '')).strip()
            professor_email = str(main_session.get('Correo', '')).strip()
            
            # Validate email
            if professor_email and not re.match(r'^[^@]+@[^@]+\.[^@]+$', professor_email):
                professor_email = ""
            
            return SectionImportData(
                section_number=section_number,
                capacity=int(main_session.get('Vacantes', 30)),
                enrolled=int(main_session.get('Matriculados', 0)),
                professor=professor_display,
                professor_email=professor_email,
                sessions=sessions
            )
            
        except Exception as e:
            self.stats['errors'].append(f"Error creating SectionImportData: {e}")
            return None

    def process_course_data(self, course_code: str, course_sessions: List[Dict]) -> Optional[CourseImportData]:
        """Process complete course data"""
        try:
            if not course_sessions:
                return None
            
            course_name = course_sessions[0].get('Curso', '').strip()
            department = self.extract_department(course_code)
            
            # Group into sections
            section_groups = self.group_sessions_into_sections(course_sessions)
            
            # Create section objects
            sections = []
            for section_number, section_sessions in section_groups.items():
                section_data = self.create_section_data(section_sessions, section_number)
                if section_data:
                    sections.append(section_data)
            
            if not sections:
                self.stats['warnings'].append(f"Course {course_code} has no valid sections")
                return None
            
            return CourseImportData(
                code=course_code,
                name=course_name,
                department=department,
                credits=3,  # Default, can be adjusted
                semester="2024-2",  # Can be parameterized
                sections=sections
            )
            
        except Exception as e:
            self.stats['errors'].append(f"Error processing course {course_code}: {e}")
            return None

    async def import_csv_file(self, file: UploadFile, university_id: int) -> Dict:
        """
        Main import function - reads CSV and imports to database
        """
        try:
            # Verify university exists
            university = self.university_repo.get_by_id(university_id)
            if not university:
                raise HTTPException(status_code=404, detail=f"University with ID {university_id} not found")
            
            # Read CSV
            content = await file.read()
            
            # Handle both Excel-exported CSV and regular CSV
            try:
                df = pd.read_csv(pd.io.common.BytesIO(content), skiprows=7, encoding='utf-8')
            except UnicodeDecodeError:
                df = pd.read_csv(pd.io.common.BytesIO(content), skiprows=7, encoding='latin1')
            
            # Clean column names
            df.columns = df.columns.str.strip()
            
            # Filter valid rows
            df = df.dropna(subset=['Código Curso'])
            df = df[df['Código Curso'].str.strip() != '']
            
            # Reset stats
            self.stats = {
                'courses_processed': 0,
                'sections_created': 0,
                'sessions_created': 0,
                'errors': [],
                'warnings': [],
                'skipped_courses': []
            }
            
            # Group by course and process
            course_groups = list(df.groupby('Código Curso'))
            total_courses = len(course_groups)
            
            for current_course, (course_code, course_df) in enumerate(course_groups, 1):
                
                try:
                    course_data = self.process_course_data(course_code, course_df.to_dict('records'))
                    
                    if course_data:
                        success = await self._import_course_to_db(course_data, university_id)
                        if success:
                            self.stats['courses_processed'] += 1
                        else:
                            self.stats['skipped_courses'].append(course_code)
                    else:
                        self.stats['skipped_courses'].append(course_code)
                        
                except Exception as e:
                    self.stats['errors'].append(f"Error processing course {course_code}: {str(e)}")
                    self.stats['skipped_courses'].append(course_code)
            
            return {
                'success': True,
                'message': 'CSV import completed',
                'stats': self.stats
            }
            
        except Exception as e:
            self.stats['errors'].append(f"Critical error during import: {str(e)}")
            return {
                'success': False,
                'message': f'Import failed: {str(e)}',
                'stats': self.stats
            }

    async def _import_course_to_db(self, course_data: CourseImportData, university_id: int) -> bool:
        """Import course data to database using repositories"""
        try:
            # Check if course already exists
            existing_course = self.course_repo.get_by_code_and_university(course_data.code, university_id)
            
            if existing_course:
                # Update existing course
                course = existing_course
            else:
                # Create new course
                course_dict = {
                    'university_id': university_id,
                    'code': course_data.code,
                    'name': course_data.name,
                    'credits': course_data.credits,
                    'department': course_data.department,
                    'semester': course_data.semester,
                    'level': 'undergraduate'
                }
                course = self.course_repo.create(course_dict)
            
            # Create sections
            for section_data in course_data.sections:
                # Check if section already exists
                existing_section = self.section_repo.get_by_course_and_number(course.id, section_data.section_number)
                
                if existing_section:
                    section = existing_section
                else:
                    section_dict = {
                        'course_id': course.id,
                        'section_number': section_data.section_number,
                        'capacity': section_data.capacity,
                        'enrolled': section_data.enrolled,
                        'professor': section_data.professor,
                        'professor_email': section_data.professor_email,
                        'semester': course_data.semester
                    }
                    section = self.section_repo.create(section_dict)
                    self.stats['sections_created'] += 1
                
                # Create sessions
                for session_data in section_data.sessions:
                    session_dict = {
                        'section_id': section.id,
                        'session_type': session_data.session_type,
                        'day': session_data.day,
                        'start_time': session_data.start_time,
                        'end_time': session_data.end_time,
                        'location': session_data.location,
                        'building': session_data.building,
                        'room': session_data.room,
                        'modality': session_data.modality,
                        'frequency': session_data.frequency
                    }
                    self.session_repo.create(session_dict)
                    self.stats['sessions_created'] += 1
            
            return True
            
        except Exception as e:
            self.stats['errors'].append(f"Error importing course {course_data.code} to DB: {str(e)}")
            return False

    def analyze_csv_file(self, file: UploadFile) -> Dict:
        """
        Analyze CSV file and return statistics without importing
        """
        try:
            # Read CSV
            content = file.file.read()
            file.file.seek(0)  # Reset file pointer
            
            try:
                df = pd.read_csv(pd.io.common.BytesIO(content), skiprows=7, encoding='utf-8')
            except UnicodeDecodeError:
                df = pd.read_csv(pd.io.common.BytesIO(content), skiprows=7, encoding='latin1')
            
            # Clean and filter
            df.columns = df.columns.str.strip()
            df = df.dropna(subset=['Código Curso'])
            df = df[df['Código Curso'].str.strip() != '']
            
            # Analyze
            analysis = {
                'total_records': len(df),
                'unique_courses': df['Código Curso'].nunique(),
                'departments': df['Código Curso'].apply(self.extract_department).value_counts().to_dict(),
                'session_types': df['Sesión Grupo'].value_counts().head(10).to_dict(),
                'modalities': df['Modalidad'].value_counts().to_dict() if 'Modalidad' in df.columns else {},
                'invalid_schedules': 0,
                'valid_schedules': 0
            }
            
            # Check schedule validity
            for schedule in df['Horario']:
                if self.parse_schedule(schedule):
                    analysis['valid_schedules'] += 1
                else:
                    analysis['invalid_schedules'] += 1
            
            return {
                'success': True,
                'analysis': analysis
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }