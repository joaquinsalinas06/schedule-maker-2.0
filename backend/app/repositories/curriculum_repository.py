from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.models.curriculum import (
    Curriculum, CurriculumCourse, CurriculumPrerequisite, UserCurriculumProgress
)
from app.repositories.base import BaseRepository


class CurriculumRepository(BaseRepository[Curriculum]):
    def __init__(self, db: Session):
        super().__init__(db, Curriculum)

    def get_by_university(self, university_id: int) -> List[Curriculum]:
        return self.db.query(Curriculum).filter(
            Curriculum.university_id == university_id,
            Curriculum.is_active == True
        ).all()

    def get_full_tree(self, curriculum_id: int) -> Optional[Curriculum]:
        return self.db.query(Curriculum).options(
            joinedload(Curriculum.courses).joinedload(CurriculumCourse.prerequisites).joinedload(CurriculumPrerequisite.prerequisite_course),
            joinedload(Curriculum.courses).joinedload(CurriculumCourse.dependents),
        ).filter(Curriculum.id == curriculum_id).first()

    def get_user_progress(self, user_id: int, curriculum_id: int) -> List[UserCurriculumProgress]:
        return self.db.query(UserCurriculumProgress).filter(
            UserCurriculumProgress.user_id == user_id,
            UserCurriculumProgress.curriculum_id == curriculum_id,
            UserCurriculumProgress.is_active == True
        ).all()

    def upsert_course_status(
        self, user_id: int, curriculum_id: int, curriculum_course_id: int, status: str
    ) -> UserCurriculumProgress:
        progress = self.db.query(UserCurriculumProgress).filter(
            UserCurriculumProgress.user_id == user_id,
            UserCurriculumProgress.curriculum_course_id == curriculum_course_id
        ).first()

        if progress:
            progress.status = status
            if status == "completed":
                from datetime import datetime
                progress.completed_at = datetime.utcnow()
            else:
                progress.completed_at = None
        else:
            progress = UserCurriculumProgress(
                user_id=user_id,
                curriculum_id=curriculum_id,
                curriculum_course_id=curriculum_course_id,
                status=status,
            )
            if status == "completed":
                from datetime import datetime
                progress.completed_at = datetime.utcnow()
            self.db.add(progress)

        self.db.commit()
        self.db.refresh(progress)
        return progress

    def bulk_upsert_status(
        self, user_id: int, curriculum_id: int, updates: List[dict]
    ) -> List[UserCurriculumProgress]:
        results = []
        for u in updates:
            r = self.upsert_course_status(user_id, curriculum_id, u["curriculum_course_id"], u["status"])
            results.append(r)
        return results

    def get_curriculum_courses(self, curriculum_id: int) -> List[CurriculumCourse]:
        return self.db.query(CurriculumCourse).options(
            joinedload(CurriculumCourse.prerequisites)
        ).filter(
            CurriculumCourse.curriculum_id == curriculum_id,
            CurriculumCourse.is_active == True
        ).all()
