from typing import Optional
from sqlalchemy.orm import Session, joinedload
from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: Session):
        super().__init__(db, User)

    def get(self, id: int) -> Optional[User]:
        return self.db.query(User).options(joinedload(User.university)).filter(User.id == id).first()

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).options(joinedload(User.university)).filter(User.email == email).first()

    def get_by_student_id(self, student_id: str) -> Optional[User]:
        return self.db.query(User).filter(User.student_id == student_id).first()

    def create_user(self, email: str, hashed_password: str, first_name: str, 
                   last_name: str, university_id: int, student_id: str) -> User:
        user_data = {
            "email": email,
            "hashed_password": hashed_password,
            "first_name": first_name,
            "last_name": last_name,
            "university_id": university_id,
            "student_id": student_id
        }
        user = self.create(user_data)
        # Reload with university relationship
        return self.db.query(User).options(joinedload(User.university)).filter(User.id == user.id).first()

    def update_last_login(self, user: User) -> User:
        from datetime import datetime
        return self.update(user, {"last_login": datetime.utcnow()})