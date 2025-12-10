from typing import List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_
import hashlib
import json
from app.models.section import Section
from app.models.session import Session as SessionModel
from app.repositories.base import BaseRepository


class SectionRepository(BaseRepository[Section]):
    def __init__(self, db: Session):
        super().__init__(db, Section)

    def get_by_course_and_number(self, course_id: int, section_number: str) -> Section:
        """Get section by course ID and section number"""
        return self.db.query(Section).filter(
            Section.course_id == course_id,
            Section.section_number == section_number,
            Section.is_active == True
        ).first()

    def calculate_content_hash(self, section_data: dict) -> str:
        """
        Calculate SHA-256 hash of section content for change detection

        Only includes fields that matter for change detection:
        capacity, enrolled, waitlisted, professor, professor_email
        """
        hash_content = {
            "capacity": section_data.get("capacity"),
            "enrolled": section_data.get("enrolled"),
            "waitlisted": section_data.get("waitlisted", 0),
            "professor": section_data.get("professor"),
            "professor_email": section_data.get("professor_email")
        }
        content_str = json.dumps(hash_content, sort_keys=True)
        return hashlib.sha256(content_str.encode()).hexdigest()

    def bulk_create_sections(self, sections_data: List[dict]) -> List[Section]:
        """
        Batch create multiple sections with hash calculation

        Optimized for mass imports - calculates hashes and uses bulk insert
        """
        for section_data in sections_data:
            section_data["content_hash"] = self.calculate_content_hash(section_data)

        section_objects = [Section(**section) for section in sections_data]
        self.db.bulk_save_objects(section_objects, return_defaults=True)
        self.db.commit()
        return section_objects

    def get_by_course_bulk(self, course_ids: List[int]) -> List[Section]:
        """
        Get sections for multiple courses in a single query (eliminates N+1)

        Returns all sections for the given course IDs
        """
        if not course_ids:
            return []

        return self.db.query(Section).filter(
            and_(
                Section.course_id.in_(course_ids),
                Section.is_active == True
            )
        ).all()

    def update_with_hash_check(self, section_id: int, new_data: dict) -> Tuple[Section, bool]:
        """
        Update section only if content hash has changed

        Returns:
            Tuple of (section, was_updated)
            - section: The section object (updated or not)
            - was_updated: True if data was actually updated, False if skipped
        """
        new_hash = self.calculate_content_hash(new_data)
        section = self.get(section_id)

        if not section:
            return None, False

        # If hash is the same, no changes needed - SKIP update
        if section.content_hash == new_hash:
            return section, False

        # Update data and hash
        new_data["content_hash"] = new_hash
        updated_section = self.update(section, new_data)
        return updated_section, True