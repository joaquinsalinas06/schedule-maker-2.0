import os
import sys
import tempfile
import logging
from typing import Dict, Any, List

from sqlalchemy.orm import Session
from sqlalchemy import text

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

        courses_preview = []
        for c in courses_data:
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
                    "enrolled": s.enrolled,
                    "sessions": sessions_detail,
                })
            courses_preview.append({
                "code": c.code,
                "name": c.name,
                "department": c.department,
                "sections_count": len(c.sections),
                "sessions_count": sum(len(s.sessions) for s in c.sections),
                "sections": sections_detail,
            })

        analysis = {
            "total_records_in_file": len(courses_data),
            "unique_courses": len(courses_data),
            "total_sections": total_sections,
            "total_sessions": total_sessions,
            "departments": departments,
            "courses_preview": courses_preview[:50],
            "mode": mode,
        }

        if mode == "update":
            existing_courses = self.course_repo.get_by_university(university_id)
            existing_codes = {c.code for c in existing_courses}
            new_codes = {c.code for c in courses_data}
            analysis["existing_courses_count"] = len(existing_courses)
            analysis["courses_to_add"] = len(new_codes - existing_codes)
            analysis["courses_to_update"] = len(new_codes & existing_codes)
            analysis["courses_not_in_file"] = len(existing_codes - new_codes)

        if mode == "reset":
            existing_courses = self.course_repo.get_by_university(university_id)
            analysis["existing_courses_to_deactivate"] = len(existing_courses)

        return analysis

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
        """Reset mode: soft-delete all existing data, then import fresh."""
        from csv_import import CSVImporter

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

            self.db.commit()
            logger.info(f"Bulk deactivation done: {stats['deactivated_courses']} courses, "
                        f"{stats['deactivated_sections']} sections, {stats['deactivated_sessions']} sessions")
        except Exception as e:
            self.db.rollback()
            stats["errors"].append(f"Error deactivating existing data: {str(e)}")
            logger.error(f"Reset deactivation failed: {e}")
            raise

        # Step 2: Import fresh data, committing per course for resilience
        importer = CSVImporter(self.db)
        for course_data in courses_data:
            try:
                importer.import_courses([course_data], university_id)
                self.db.commit()
                stats["courses_created"] += 1
                stats["sections_created"] += len(course_data.sections)
                stats["sessions_created"] += sum(
                    len(s.sessions) for s in course_data.sections
                )
            except Exception as e:
                self.db.rollback()
                error_msg = f"Error importing {course_data.code}: {str(e)}"
                stats["errors"].append(error_msg)
                logger.warning(error_msg)

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
