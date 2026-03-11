from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.curriculum_repository import CurriculumRepository
from app.models.curriculum import Curriculum, CurriculumCourse, UserCurriculumProgress


class CurriculumService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CurriculumRepository(db)

    def list_curricula(self, university_id: int) -> List[Curriculum]:
        return self.repo.get_by_university(university_id)

    def get_curriculum_tree(self, curriculum_id: int) -> Optional[dict]:
        curriculum = self.repo.get_full_tree(curriculum_id)
        if not curriculum:
            return None

        courses_data = []
        for cc in curriculum.courses:
            prereqs = []
            for p in cc.prerequisites:
                prereqs.append({
                    "id": p.id,
                    "prerequisite_course_id": p.prerequisite_course_id,
                    "prerequisite_type": p.prerequisite_type,
                    "required_credits": p.required_credits,
                    "prerequisite_course_name": p.prerequisite_course.course_name if p.prerequisite_course else None,
                })
            courses_data.append({
                "id": cc.id,
                "course_name": cc.course_name,
                "semester": cc.semester,
                "credits": cc.credits,
                "is_elective": cc.is_elective,
                "elective_group": cc.elective_group,
                "linked_course_id": cc.linked_course_id,
                "prerequisites": prereqs,
            })

        return {
            "id": curriculum.id,
            "name": curriculum.name,
            "code": curriculum.code,
            "year": curriculum.year,
            "total_credits": curriculum.total_credits,
            "total_semesters": curriculum.total_semesters,
            "courses": courses_data,
        }

    def get_progress(self, user_id: int, curriculum_id: int) -> dict:
        curriculum = self.repo.get_full_tree(curriculum_id)
        if not curriculum:
            return {}

        progress_list = self.repo.get_user_progress(user_id, curriculum_id)
        progress_map = {p.curriculum_course_id: p.status for p in progress_list}

        completed_credits = 0
        completed_count = 0
        in_progress_count = 0
        total_non_elective = 0

        for cc in curriculum.courses:
            status = progress_map.get(cc.id, "pending")
            if status == "completed":
                completed_credits += cc.credits
                completed_count += 1
            elif status == "in_progress":
                in_progress_count += 1
            if not cc.is_elective:
                total_non_elective += 1

        total_courses = len(curriculum.courses)
        unlocked = self._compute_unlocked(curriculum.courses, progress_map, completed_credits)

        return {
            "curriculum_id": curriculum_id,
            "progress": [
                {
                    "curriculum_course_id": p.curriculum_course_id,
                    "status": p.status,
                    "completed_at": p.completed_at.isoformat() if p.completed_at else None,
                }
                for p in progress_list
            ],
            "summary": {
                "completed": completed_count,
                "in_progress": in_progress_count,
                "total": total_courses,
                "credits_earned": completed_credits,
                "credits_total": curriculum.total_credits,
                "percentage": round(completed_credits / curriculum.total_credits * 100, 1) if curriculum.total_credits > 0 else 0,
                "unlocked_count": len(unlocked),
            },
        }

    def update_course_status(self, user_id: int, curriculum_id: int, curriculum_course_id: int, status: str):
        return self.repo.upsert_course_status(user_id, curriculum_id, curriculum_course_id, status)

    def bulk_update_status(self, user_id: int, curriculum_id: int, updates: List[dict]):
        return self.repo.bulk_upsert_status(user_id, curriculum_id, updates)

    def get_unlocked_courses(self, user_id: int, curriculum_id: int) -> dict:
        curriculum = self.repo.get_full_tree(curriculum_id)
        if not curriculum:
            return {"unlocked_course_ids": [], "unlocked_curriculum_course_ids": []}

        progress_list = self.repo.get_user_progress(user_id, curriculum_id)
        progress_map = {p.curriculum_course_id: p.status for p in progress_list}
        completed_credits = sum(
            cc.credits for cc in curriculum.courses
            if progress_map.get(cc.id) == "completed"
        )

        unlocked = self._compute_unlocked(curriculum.courses, progress_map, completed_credits)

        # Return both curriculum_course_ids and linked_course_ids (for schedule filtering)
        unlocked_linked = [
            cc.linked_course_id for cc in curriculum.courses
            if cc.id in unlocked and cc.linked_course_id is not None
        ]

        return {
            "unlocked_curriculum_course_ids": list(unlocked),
            "unlocked_course_ids": unlocked_linked,
        }

    def _compute_unlocked(
        self, courses: List[CurriculumCourse], progress_map: dict, completed_credits: int
    ) -> set:
        """Compute which courses are unlocked (prereqs met, not completed)."""
        unlocked = set()

        for cc in courses:
            status = progress_map.get(cc.id, "pending")
            if status == "completed":
                continue

            # Electives are always unlocked
            if cc.is_elective:
                unlocked.add(cc.id)
                continue

            # Check all prerequisites
            all_met = True
            for prereq in cc.prerequisites:
                if prereq.prerequisite_type == "course":
                    if progress_map.get(prereq.prerequisite_course_id) != "completed":
                        all_met = False
                        break
                elif prereq.prerequisite_type == "credits":
                    if completed_credits < (prereq.required_credits or 0):
                        all_met = False
                        break

            # Courses with no prerequisites are unlocked by default
            if all_met:
                unlocked.add(cc.id)

        return unlocked

    def set_user_curriculum(self, user_id: int, curriculum_id: Optional[int]):
        """Set or unset the user's active curriculum."""
        from app.models.user import User
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            user.curriculum_id = curriculum_id
            self.db.commit()
        return user
