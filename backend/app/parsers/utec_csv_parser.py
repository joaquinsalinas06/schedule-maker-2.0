import pandas as pd
import re
from datetime import time
from typing import List, Optional, Tuple, Dict
from collections import defaultdict
import io

from .base_parser import BaseParser, ParsedCourse, ParsedSection, ParsedSession, ParserException

class UTECCSVParser(BaseParser):
    """
    Parser for UTEC's CSV format

    Refactored from scripts/csv_import.py to support the parser factory pattern.
    Handles hierarchical section structures including decimal theory patterns.
    """

    def validate_format(self, file_content: bytes, filename: str) -> bool:
        """Check if file is UTEC CSV format"""
        if not filename.lower().endswith('.csv'):
            return False

        try:
            df = pd.read_csv(io.BytesIO(file_content), encoding='utf-8', nrows=1)
            required_columns = ['Código Curso', 'Curso', 'Sección', 'Sesión Grupo', 'Horario']
            return all(col in df.columns for col in required_columns)
        except Exception:
            return False

    def parse(self, file_content: bytes, filename: str) -> List[ParsedCourse]:
        """Parse UTEC CSV file"""
        try:
            df = pd.read_csv(io.BytesIO(file_content), encoding='utf-8')
        except UnicodeDecodeError:
            try:
                df = pd.read_csv(io.BytesIO(file_content), encoding='latin-1')
            except Exception as e:
                raise ParserException(f"Failed to read CSV file: {str(e)}")

        # Skip empty rows
        df = df.dropna(how='all')

        # First pass: collect all sessions by course
        course_sessions = defaultdict(list)
        course_names = {}

        for _, row in df.iterrows():
            course_code = str(row.get('Código Curso', '')).strip()
            course_name = str(row.get('Curso', '')).strip()

            if not course_code or not course_name:
                continue

            course_names[course_code] = course_name

            section_num = str(row.get('Sección', '')).strip()
            if not section_num:
                continue

            session_group = str(row.get('Sesión Grupo', '')).strip()
            if not session_group:
                continue

            professor = str(row.get('Docente', 'TBD')).strip()
            professor_email = str(row.get('Correo', '')).strip()

            try:
                capacity = int(row.get('Vacantes', 30))
                enrolled = int(row.get('Matriculados', 0))
                waitlisted = int(row.get('Lista de Espera', 0))
            except (ValueError, TypeError):
                capacity, enrolled, waitlisted = 30, 0, 0

            horario = str(row.get('Horario', '')).strip()
            days, start_time, end_time = self.parse_schedule(horario)

            if not days or not start_time or not end_time:
                continue

            modality = str(row.get('Modalidad', 'Presencial')).strip()
            frequency = str(row.get('Frecuencia', 'Semana General')).strip()
            location = str(row.get('Ubicación', '')).strip()

            # Create session data for each day
            for day in days:
                session_data = ParsedSession(
                    session_type=session_group,
                    day=day,
                    start_time=start_time,
                    end_time=end_time,
                    location=location,
                    building=self.extract_building(location),
                    room=self.extract_room(location),
                    modality=modality,
                    frequency=frequency
                )

                session_with_meta = {
                    'session': session_data,
                    'professor': professor,
                    'professor_email': professor_email,
                    'capacity': capacity,
                    'enrolled': enrolled,
                    'waitlisted': waitlisted,
                    'session_group': session_group,
                    'section_num': section_num
                }

                course_sessions[course_code].append(session_with_meta)

        # Second pass: Create sections respecting hierarchical structure
        result = []
        for course_code, all_sessions in course_sessions.items():
            course_name = course_names.get(course_code, 'Unknown Course')
            sections = self.create_hierarchical_sections(all_sessions)
            department = self.extract_department(course_code)

            course_data = ParsedCourse(
                code=course_code,
                name=course_name,
                department=department,
                sections=sections
            )
            result.append(course_data)

        return result

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
        """Parse schedule string like 'Mar. 15:00 - 18:00'"""
        if not schedule_str or pd.isna(schedule_str):
            return [], None, None

        schedule_str = str(schedule_str).strip()

        # Pattern: "Mar. 15:00 - 18:00" or "Lun. Mie. 10:00 - 12:00"
        time_pattern = r'(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})'
        time_match = re.search(time_pattern, schedule_str)

        if not time_match:
            return [], None, None

        start_time = self.parse_time(time_match.group(1))
        end_time = self.parse_time(time_match.group(2))

        if not start_time or not end_time:
            return [], None, None

        # Extract days part (everything before the time)
        days_part = schedule_str[:time_match.start()].strip()

        # Spanish day abbreviations
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

        match = re.match(r'^([^A-Z0-9]*[A-Z\-]+)', location)
        return match.group(1).strip() if match else ""

    def extract_room(self, location: str) -> str:
        """Extract room from location string like 'UTEC-BA A602(23)'"""
        if not location:
            return ""

        match = re.search(r'([A-Z]\d+)', location)
        return match.group(1) if match else ""

    def create_hierarchical_sections(self, all_sessions: List[dict]) -> List[ParsedSection]:
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

    def _create_decimal_pattern_sections(self, all_sessions: List[dict]) -> List[ParsedSection]:
        """Handle courses with TEORÍA X.XX pattern"""
        sessions_by_type = defaultdict(list)
        for session_meta in all_sessions:
            session_group = session_meta['session_group']
            sessions_by_type[session_group].append(session_meta)

        # Find main theories and decimal theories
        main_theories = {}  # theory number -> sessions
        decimal_theories = defaultdict(list)  # theory number -> list of decimal sessions

        for session_group, sessions in sessions_by_type.items():
            theory_match = re.match(r'TEORÍA (\d+)$', session_group)
            if theory_match:
                theory_num = int(theory_match.group(1))
                main_theories[theory_num] = sessions
                continue

            decimal_match = re.match(r'TEORÍA (\d+)\.(\d+)', session_group)
            if decimal_match:
                theory_num = int(decimal_match.group(1))
                decimal_theories[theory_num].append({
                    'session_group': session_group,
                    'sessions': sessions
                })

        # Create sections: one per decimal theory (with shared main theory)
        result = []
        for theory_num, decimal_list in decimal_theories.items():
            main_theory_sessions = main_theories.get(theory_num, [])

            for decimal_info in decimal_list:
                decimal_sessions = decimal_info['sessions']
                section_number = decimal_info['session_group']

                # Combine main theory + decimal theory sessions
                all_section_sessions = main_theory_sessions + decimal_sessions

                # Aggregate professor info
                professors = set()
                emails = set()
                capacities = []
                enrollments = []
                waitlists = []

                for session_meta in all_section_sessions:
                    if session_meta['professor'] and session_meta['professor'] != 'TBD':
                        professors.add(session_meta['professor'])
                    if session_meta['professor_email']:
                        emails.add(session_meta['professor_email'])
                    capacities.append(session_meta['capacity'])
                    enrollments.append(session_meta['enrolled'])
                    waitlists.append(session_meta['waitlisted'])

                professor = ', '.join(sorted(professors)) if professors else 'TBD'
                professor_email = ', '.join(sorted(emails)) if emails else ''
                capacity = max(capacities) if capacities else 30
                enrolled = max(enrollments) if enrollments else 0
                waitlisted = max(waitlists) if waitlists else 0

                # Truncate if too long
                if len(professor) > 250:
                    professor = professor[:247] + '...'
                if len(professor_email) > 250:
                    professor_email = professor_email[:247] + '...'

                sessions = [s['session'] for s in all_section_sessions]

                section_data = ParsedSection(
                    section_number=section_number,
                    capacity=capacity,
                    enrolled=enrolled,
                    waitlisted=waitlisted,
                    professor=professor,
                    professor_email=professor_email,
                    sessions=sessions
                )
                result.append(section_data)

        return result

    def _create_standard_sections(self, all_sessions: List[dict]) -> List[ParsedSection]:
        """Handle standard section pattern (original CSV sections)"""
        sections_by_number = defaultdict(list)

        for session_meta in all_sessions:
            section_num = session_meta['section_num']
            sections_by_number[section_num].append(session_meta)

        result = []
        for section_num, session_metas in sections_by_number.items():
            # Aggregate professor info
            professors = set()
            emails = set()
            capacities = []
            enrollments = []
            waitlists = []

            for session_meta in session_metas:
                if session_meta['professor'] and session_meta['professor'] != 'TBD':
                    professors.add(session_meta['professor'])
                if session_meta['professor_email']:
                    emails.add(session_meta['professor_email'])
                capacities.append(session_meta['capacity'])
                enrollments.append(session_meta['enrolled'])
                waitlists.append(session_meta['waitlisted'])

            professor = ', '.join(sorted(professors)) if professors else 'TBD'
            professor_email = ', '.join(sorted(emails)) if emails else ''
            capacity = max(capacities) if capacities else 30
            enrolled = max(enrollments) if enrollments else 0
            waitlisted = max(waitlists) if waitlists else 0

            # Truncate if too long
            if len(professor) > 250:
                professor = professor[:247] + '...'
            if len(professor_email) > 250:
                professor_email = professor_email[:247] + '...'

            sessions = [s['session'] for s in session_metas]

            section_data = ParsedSection(
                section_number=section_num,
                capacity=capacity,
                enrolled=enrolled,
                waitlisted=waitlisted,
                professor=professor,
                professor_email=professor_email,
                sessions=sessions
            )
            result.append(section_data)

        return result
