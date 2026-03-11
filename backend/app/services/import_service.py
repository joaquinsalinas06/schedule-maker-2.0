import os
import sys
import tempfile
import logging
from typing import Dict, Any, List, Optional
from collections import defaultdict

from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.course import Course
from app.models.section import Section
from app.models.session import Session as SessionModel
from app.repositories.course_repository import CourseRepository
from app.repositories.section_repository import SectionRepository
from app.repositories.session_repository import SessionRepository
from app.repositories.university_repository import UniversityRepository

# Ensure scripts directory is importable
from pathlib import Path
_scripts_dir = str(Path(__file__).parent.parent.parent / "scripts")
if _scripts_dir not in sys.path:
    sys.path.insert(0, _scripts_dir)

logger = logging.getLogger(__name__)


class ImportService:
    """Service layer wrapping CSV import/update logic for API use."""

    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS = {'.csv', '.xlsx', '.xls'}
    ALLOWED_CONTENT_TYPES = {
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/octet-stream',
    }

    def __init__(self, db: Session):
        self.db = db
        self.course_repo = CourseRepository(db)
        self.section_repo = SectionRepository(db)
        self.session_repo = SessionRepository(db)
        self.university_repo = UniversityRepository(db)

    def validate_file(self, filename: str, content_type: str, file_size: int) -> List[str]:
        """Validate file before processing. Returns list of errors (empty = valid)."""
        errors = []

        ext = os.path.splitext(filename)[1].lower() if filename else ''
        if ext not in self.ALLOWED_EXTENSIONS:
            errors.append(f"Tipo de archivo '{ext}' no permitido. Permitidos: {', '.join(self.ALLOWED_EXTENSIONS)}")

        if content_type not in self.ALLOWED_CONTENT_TYPES:
            errors.append(f"Content type '{content_type}' no permitido")

        if file_size > self.MAX_FILE_SIZE:
            errors.append(f"Archivo muy grande ({file_size / 1024 / 1024:.1f}MB). Maximo: {self.MAX_FILE_SIZE / 1024 / 1024:.0f}MB")

        if file_size == 0:
            errors.append("El archivo esta vacio")

        return errors

    def analyze_file(self, file_bytes: bytes, filename: str, mode: str, university_id: int) -> Dict[str, Any]:
        """Analyze a CSV/Excel file and return a preview of what would change. Does NOT modify the DB."""
        courses_data = self._parse_file(file_bytes, filename)

        total_sections = sum(len(c.sections) for c in courses_data)
        total_sessions = sum(len(s.sessions) for c in courses_data for s in c.sections)

        departments = {}
        for c in courses_data:
            departments[c.department] = departments.get(c.department, 0) + 1

        analysis = {
            "total_records_in_file": len(courses_data),
            "unique_courses": len(courses_data),
            "total_sections": total_sections,
            "total_sessions": total_sessions,
            "departments": departments,
            "mode": mode,
            "courses_preview": [],
        }

        if mode == "update":
            # Deep Analyze: find real differences
            all_existing_courses = self.course_repo.get_by_university(university_id)
            existing_map = {c.code: c for c in all_existing_courses}
            course_ids = [c.id for c in all_existing_courses]

            # Batch fetch all sections and sessions for university for speed
            all_db_sections = self.db.query(Section).filter(Section.course_id.in_(course_ids), Section.is_active == True).all()
            all_db_sessions = self.db.query(SessionModel).filter(SessionModel.section_id.in_([s.id for s in all_db_sections]), SessionModel.is_active == True).all()

            # Map them for easy lookup
            sections_by_course = defaultdict(list)
            for s in all_db_sections: sections_by_course[s.course_id].append(s)
            sessions_by_section = defaultdict(list)
            for s in all_db_sessions: sessions_by_section[s.section_id].append(s)

            new_courses = []
            changed_courses = []
            unchanged_count = 0

            for new_c in courses_data:
                old_c = existing_map.get(new_c.code)
                if not old_c:
                    new_courses.append(self._to_preview_dict(new_c, is_new=True))
                else:
                    diffs = self._detect_diffs(new_c, old_c, sections_by_course, sessions_by_section)
                    if diffs:
                        changed_courses.append(self._to_preview_dict(new_c, diffs=diffs))
                    else:
                        unchanged_count += 1

            analysis.update({
                "existing_courses_count": len(all_existing_courses),
                "courses_to_add": len(new_courses),
                "courses_to_update": len(changed_courses),
                "unchanged_courses_count": unchanged_count,
                "courses_not_in_file": len(set(existing_map.keys()) - {c.code for c in courses_data}),
                "courses_preview": (new_courses + changed_courses)[:50]
            })

        elif mode == "reset":
            existing_courses = self.course_repo.get_by_university(university_id)
            analysis["existing_courses_to_deactivate"] = len(existing_courses)
            analysis["courses_preview"] = [self._to_preview_dict(c) for c in courses_data[:50]]

        return analysis

    def _to_preview_dict(self, c, is_new=False, diffs=None):
        """Build dictionary for UI preview."""
        sections_detail = []
        for s in c.sections:
            sessions_detail = []
            for sess in s.sessions:
                sessions_detail.append({
                    "type": sess.session_type,
                    "day": sess.day,
                    "start_time": sess.start_time.strftime("%H:%M") if sess.start_time else "",
                    "end_time": sess.end_time.strftime("%H:%M") if sess.end_time else "",
                    "location": sess.location,
                    "modality": sess.modality,
                })
            sections_detail.append({
                "number": s.section_number,
                "professor": s.professor,
                "capacity": s.capacity,
                "sessions": sessions_detail,
            })
        return {
            "code": c.code,
            "name": c.name,
            "department": c.department,
            "sections_count": len(c.sections),
            "is_new": is_new,
            "diffs": diffs or [],
            "sections": sections_detail,
        }

    def _detect_diffs(self, new_c, old_c, sections_by_course, sessions_by_section):
        """Determine if course contents changed significantly."""
        diffs = []
        if new_c.name != old_c.name: diffs.append("Nombre")
        if new_c.department != old_c.department: diffs.append("Departamento")

        existing_sections = sections_by_course.get(old_c.id, [])
        old_sects_map = {s.section_number: s for s in existing_sections}
        new_sects_map = {s.section_number: s for s in new_c.sections}

        if set(old_sects_map.keys()) != set(new_sects_map.keys()):
            added = len(set(new_sects_map.keys()) - set(old_sects_map.keys()))
            removed = len(set(old_sects_map.keys()) - set(new_sects_map.keys()))
            if added: diffs.append(f"+{added} Secciones")
            if removed: diffs.append(f"-{removed} Secciones")
        
        # Check existing section details
        for num, old_s in old_sects_map.items():
            if num in new_sects_map:
                new_s = new_sects_map[num]
                if old_s.professor != new_s.professor:
                    diffs.append(f"Secc {num}: Profesor")
                if old_s.capacity != new_s.capacity:
                    diffs.append(f"Secc {num}: Vacantes")
                
                # Compare sessions
                old_sessions = sessions_by_section.get(old_s.id, [])
                new_sessions = new_s.sessions
                if len(old_sessions) != len(new_sessions):
                    diffs.append(f"Secc {num}: Horarios(cant)")
                else:
                    # Compare session details (day, time, etc)
                    # For simplicity, count signatures
                    old_sigs = {f"{s.day}|{s.start_time}|{s.end_time}" for s in old_sessions}
                    new_sigs = {f"{s.day}|{s.start_time}|{s.end_time}" for s in new_sessions}
                    if old_sigs != new_sigs:
                         diffs.append(f"Secc {num}: Horarios")

        return diffs

    def execute_import(self, file_bytes: bytes, filename: str, mode: str, university_id: int) -> Dict[str, Any]:
        """Execute the actual import. Modifies the database."""
        university = self.university_repo.get_by_id(university_id)
        if not university:
            raise ValueError(f"Universidad con ID {university_id} no encontrada")

        courses_data = self._parse_file(file_bytes, filename)

        if mode == "reset":
            return self._execute_reset(courses_data, university_id)
        elif mode == "update":
            return self._execute_update(courses_data, university_id)
        else:
            raise ValueError(f"Modo invalido: {mode}. Debe ser 'reset' o 'update'.")

    def _parse_file(self, file_bytes: bytes, filename: str):
        """Parse file bytes into CourseImportData list, reusing existing parsing logic."""
        import pandas as pd
        from csv_import import CSVImporter

        ext = os.path.splitext(filename)[1].lower() if filename else '.csv'

        with tempfile.NamedTemporaryFile(suffix=ext, delete=False, mode='wb') as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            if ext in ('.xlsx', '.xls'):
                df = pd.read_excel(tmp_path)
                
                # Find dynamic header row since some files start with empty/name rows
                header_idx = None
                for idx, row in df.iterrows():
                    row_strs = [str(x).strip() for x in row.values]
                    if "Código Curso" in row_strs or "Curso" in row_strs:
                        header_idx = idx
                        break
                
                if header_idx is not None:
                    df.columns = df.iloc[header_idx]
                    df = df.iloc[header_idx + 1:]
                
                csv_tmp = tempfile.NamedTemporaryFile(suffix='.csv', delete=False, mode='w', newline='', encoding='utf-8')
                df.to_csv(csv_tmp.name, index=False, encoding='utf-8')
                csv_tmp.close()
                importer = CSVImporter(self.db)
                courses_data = importer.parse_csv_file(csv_tmp.name)
                os.unlink(csv_tmp.name)
            else:
                importer = CSVImporter(self.db)
                courses_data = importer.parse_csv_file(tmp_path)
        finally:
            os.unlink(tmp_path)

        return courses_data

    def _execute_reset(self, courses_data, university_id: int) -> Dict[str, Any]:
        """Reset mode: soft-delete all existing data, then bulk import fresh."""
        stats = {
            "mode": "reset",
            "deactivated_courses": 0,
            "deactivated_sections": 0,
            "deactivated_sessions": 0,
            "courses_created": 0,
            "sections_created": 0,
            "sessions_created": 0,
            "errors": [],
        }

        try:
            # Step 1: Bulk deactivate all existing data (3 queries instead of thousands)
            result_sessions = self.db.execute(text("""
                UPDATE sessions SET is_active = false
                WHERE section_id IN (
                    SELECT s.id FROM sections s
                    JOIN courses c ON s.course_id = c.id
                    WHERE c.university_id = :uid AND s.is_active = true
                ) AND is_active = true
            """), {"uid": university_id})
            stats["deactivated_sessions"] = result_sessions.rowcount

            result_sections = self.db.execute(text("""
                UPDATE sections SET is_active = false
                WHERE course_id IN (
                    SELECT id FROM courses
                    WHERE university_id = :uid AND is_active = true
                ) AND is_active = true
            """), {"uid": university_id})
            stats["deactivated_sections"] = result_sections.rowcount

            result_courses = self.db.execute(text("""
                UPDATE courses SET is_active = false
                WHERE university_id = :uid AND is_active = true
            """), {"uid": university_id})
            stats["deactivated_courses"] = result_courses.rowcount

            self.db.flush()
            logger.info(f"Bulk deactivation done: {stats['deactivated_courses']} courses, "
                        f"{stats['deactivated_sections']} sections, {stats['deactivated_sessions']} sessions")
        except Exception as e:
            self.db.rollback()
            stats["errors"].append(f"Error deactivating existing data: {str(e)}")
            logger.error(f"Reset deactivation failed: {e}")
            raise

        # Step 2: Bulk insert all courses, sections, and sessions
        # Since we deactivated everything, no need for existence checks
        try:
            BATCH_SIZE = 50
            for batch_start in range(0, len(courses_data), BATCH_SIZE):
                batch = courses_data[batch_start:batch_start + BATCH_SIZE]

                # Create all Course objects for this batch
                course_objects = []
                for course_data in batch:
                    course_obj = Course(
                        code=course_data.code,
                        name=course_data.name,
                        department=course_data.department,
                        university_id=university_id,
                        is_active=True,
                    )
                    course_objects.append((course_obj, course_data))
                    self.db.add(course_obj)

                # Flush to get course IDs assigned
                self.db.flush()

                # Create all Section objects for this batch
                section_objects = []
                for course_obj, course_data in course_objects:
                    for section_data in course_data.sections:
                        section_obj = Section(
                            section_number=section_data.section_number,
                            capacity=section_data.capacity,
                            enrolled=section_data.enrolled,
                            professor=section_data.professor,
                            professor_email=section_data.professor_email,
                            course_id=course_obj.id,
                            is_active=True,
                        )
                        section_objects.append((section_obj, section_data))
                        self.db.add(section_obj)
                        stats["sections_created"] += 1

                # Flush to get section IDs assigned
                self.db.flush()

                # Create all Session objects for this batch
                session_objects = []
                for section_obj, section_data in section_objects:
                    for sess_data in section_data.sessions:
                        session_obj = SessionModel(
                            session_type=sess_data.session_type,
                            day=sess_data.day,
                            start_time=sess_data.start_time,
                            end_time=sess_data.end_time,
                            location=sess_data.location,
                            building=sess_data.building,
                            room=sess_data.room,
                            modality=sess_data.modality,
                            frequency=sess_data.frequency,
                            section_id=section_obj.id,
                            is_active=True,
                        )
                        session_objects.append(session_obj)
                        stats["sessions_created"] += 1

                self.db.add_all(session_objects)
                stats["courses_created"] += len(batch)

                logger.info(f"Batch {batch_start // BATCH_SIZE + 1}: inserted {len(batch)} courses")

            # Single commit for all data
            self.db.commit()
            logger.info(f"Bulk import complete: {stats['courses_created']} courses, "
                        f"{stats['sections_created']} sections, {stats['sessions_created']} sessions")

        except Exception as e:
            self.db.rollback()
            error_msg = f"Error in bulk import: {str(e)}"
            stats["errors"].append(error_msg)
            logger.error(error_msg)
            raise

        return stats

    def _execute_update(self, courses_data, university_id: int) -> Dict[str, Any]:
        """Update mode: update existing, add new, deactivate missing."""
        from csv_update import CSVUpdater

        try:
            updater = CSVUpdater(self.db)
            updated_count, changes = updater.update_courses(courses_data, university_id)
            self.db.commit()

            return {
                "mode": "update",
                "courses_processed": updated_count,
                **changes,
                "errors": [],
            }
        except Exception as e:
            self.db.rollback()
            logger.error(f"Update import failed: {e}")
            raise
