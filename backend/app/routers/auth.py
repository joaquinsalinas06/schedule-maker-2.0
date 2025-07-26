from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models import User
from app.schemas import UserCreate, UserLogin, UserResponse, Token, APIResponse, AuthResponse
from app.services.auth_service import AuthService
from app.utils.dependencies import get_current_active_user

router = APIRouter(prefix="/api/auth", tags=["authentication"])

@router.post("/register", response_model=AuthResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    access_token, db_user = auth_service.register_user(
        email=user.email,
        password=user.password,
        first_name=user.first_name,
        last_name=user.last_name,
        university_id=user.university_id,
        student_id=user.student_id
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }

@router.post("/login", response_model=AuthResponse)
def login_user(user_credentials: UserLogin, db: Session = Depends(get_db)):
    print(user_credentials)
    auth_service = AuthService(db)
    access_token, user = auth_service.authenticate_user(
        email=user_credentials.email,
        password=user_credentials.password
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": user
    }

@router.post("/refresh", response_model=Token)
def refresh_token(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    access_token = auth_service.refresh_user_token(current_user.id)
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    return current_user