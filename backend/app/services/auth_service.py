from typing import Optional
from datetime import timedelta
import os
import uuid
import aiofiles
from sqlalchemy.orm import Session
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.repositories.university_repository import UniversityRepository
from app.utils.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.services.cloudinary_service import cloudinary_service
from fastapi import HTTPException, status, UploadFile


class AuthService:
    def __init__(self, db: Session):
        self.user_repo = UserRepository(db)
        self.university_repo = UniversityRepository(db)

    def register_user(self, user_data, remember_me: bool = False) -> tuple[str, str, User]:
        # Check if user already exists
        if self.user_repo.get_by_email(user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Verify university exists
        if not self.university_repo.get(user_data.university_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="University not found"
            )
        
        # Create new user
        hashed_password = get_password_hash(user_data.password)
        user = self.user_repo.create_user(
            email=user_data.email,
            hashed_password=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            university_id=user_data.university_id,
            student_id=user_data.student_id
        )
        
        # Create tokens
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            subject=user.id, expires_delta=access_token_expires
        )
        
        refresh_token = None
        if remember_me:
            refresh_token = create_refresh_token(subject=user.id)
        
        return access_token, refresh_token, user

    def authenticate_user(self, user_credentials, remember_me: bool = False) -> tuple[str, str, User]:
        user = self.user_repo.get_by_email(user_credentials.email)
        
        if not user or not verify_password(user_credentials.password, user.hashed_password):
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
        
        # Create tokens
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            subject=user.id, expires_delta=access_token_expires
        )
        
        refresh_token = None
        if remember_me:
            refresh_token = create_refresh_token(subject=user.id)
        
        return access_token, refresh_token, user

    def refresh_access_token(self, refresh_token: str) -> tuple[str, User]:
        # Decode and validate refresh token
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user from database
        user = self.user_repo.get(int(user_id))
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create new access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            subject=user.id, expires_delta=access_token_expires
        )
        
        return access_token, user

    def update_user_profile(self, user_id: int, profile_data) -> User:
        """Update user profile information (all fields except email)"""
        user = self.user_repo.get(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update only the provided fields
        update_dict = {}
        for field, value in profile_data.dict(exclude_unset=True).items():
            if hasattr(user, field):
                update_dict[field] = value
        
        if update_dict:
            updated_user = self.user_repo.update(user, update_dict)
            return updated_user
        
        return user

    async def upload_profile_photo(self, user_id: int, file: UploadFile) -> str:
        """Upload profile photo to Cloudinary and update user profile"""
        user = self.user_repo.get(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Delete old photo if exists
        if user.profile_photo:
            await cloudinary_service.delete_profile_photo(user_id)
        
        # Upload new photo to Cloudinary
        photo_url = await cloudinary_service.upload_profile_photo(file, user_id)
        
        # Update user profile with new photo URL
        self.user_repo.update(user_id, {"profile_photo": photo_url})
        
        return photo_url

