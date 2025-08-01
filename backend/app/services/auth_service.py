from typing import Optional
from datetime import timedelta
from sqlalchemy.orm import Session
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.repositories.university_repository import UniversityRepository
from app.utils.security import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from fastapi import HTTPException, status


class AuthService:
    def __init__(self, db: Session):
        self.user_repo = UserRepository(db)
        self.university_repo = UniversityRepository(db)

    def register_user(self, email: str, password: str, first_name: str, 
                     last_name: str, university_id: int, student_id: str) -> tuple[str, User]:
        # Check if user already exists
        if self.user_repo.get_by_email(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Verify university exists
        if not self.university_repo.get(university_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="University not found"
            )
        
        # Create new user
        hashed_password = get_password_hash(password)
        user = self.user_repo.create_user(
            email=email,
            hashed_password=hashed_password,
            first_name=first_name,
            last_name=last_name,
            university_id=university_id,
            student_id=student_id
        )
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            subject=user.id, expires_delta=access_token_expires
        )
        
        return access_token, user

    def authenticate_user(self, email: str, password: str) -> tuple[str, User]:
        user = self.user_repo.get_by_email(email)
        
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        
        # Update last login
        self.user_repo.update_last_login(user)
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            subject=user.id, expires_delta=access_token_expires
        )
        
        return access_token, user

    def refresh_user_token(self, user_id: int) -> str:
        user = self.user_repo.get(user_id)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        return create_access_token(
            subject=user.id, expires_delta=access_token_expires
        )