from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from app.models import User
from app.schemas import UserCreate, UserLogin, UserResponse, UserProfileUpdate, Token, APIResponse, AuthResponse, RefreshTokenRequest
from app.utils.dependencies import get_current_active_user, get_auth_service

router = APIRouter(prefix="/api/auth", tags=["authentication"])

@router.post("/register", response_model=AuthResponse)
def register_user(
    user: UserCreate, 
    auth_service = Depends(get_auth_service)
):
    access_token, refresh_token, db_user = auth_service.register_user(user, remember_me=False)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": db_user
    }

@router.post("/login", response_model=AuthResponse)
def login_user(
    user_credentials: UserLogin, 
    auth_service = Depends(get_auth_service)
):
    access_token, refresh_token, user = auth_service.authenticate_user(
        user_credentials, 
        remember_me=user_credentials.remember_me
    )
    
    return {
        "access_token": access_token, 
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/refresh", response_model=AuthResponse)
def refresh_access_token(
    refresh_request: RefreshTokenRequest,
    auth_service = Depends(get_auth_service)
):
    access_token, user = auth_service.refresh_access_token(refresh_request.refresh_token)
    
    return {
        "access_token": access_token,
        "refresh_token": None,  # Don't return a new refresh token
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.put("/profile", response_model=UserResponse)
def update_user_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    auth_service = Depends(get_auth_service)
):
    """Update user profile information (all fields except email)"""
    updated_user = auth_service.update_user_profile(current_user.id, profile_data)
    return updated_user

@router.post("/upload-profile-photo")
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    auth_service = Depends(get_auth_service)
):
    """Upload profile photo"""
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Validate file size (max 5MB)
    if file.size > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must be less than 5MB"
        )
    
    photo_url = await auth_service.upload_profile_photo(current_user.id, file)
    return {"url": photo_url}