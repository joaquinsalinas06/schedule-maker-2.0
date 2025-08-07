from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from app.models import User
from app.models.email_verification import EmailVerification
from app.schemas import UserCreate, UserLogin, UserResponse, UserProfileUpdate, Token, APIResponse, AuthResponse, RefreshTokenRequest
from app.utils.dependencies import get_current_active_user, get_auth_service, get_db
from app.services.email_verification_service import email_verification_service
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime

class EmailVerificationRequest(BaseModel):
    email: str

class VerifyCodeRequest(BaseModel):
    email: str
    code: str

class ResendVerificationRequest(BaseModel):
    email: str

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

@router.post("/cloudinary-status")
async def check_cloudinary_status():
    """Check if Cloudinary and moderation are working"""
    from app.services.cloudinary_service import cloudinary_service
    import cloudinary
    
    try:
        # Test basic Cloudinary connection
        config = cloudinary.config()
        if not all([config.cloud_name, config.api_key, config.api_secret]):
            return {
                "cloudinary": "❌ Not configured",
                "moderation": "❌ Cannot test - Cloudinary not configured"
            }
        
        # Test if we can access the API
        result = cloudinary.api.ping()
        if result.get('status') == 'ok':
            return {
                "cloudinary": "✅ Connected",
                "moderation": "🔍 Upload an image to test moderation",
                "note": "AWS Rekognition moderation will be tested on first photo upload"
            }
        else:
            return {
                "cloudinary": "❌ Connection failed",
                "moderation": "❌ Cannot test - Connection failed"
            }
    except Exception as e:
        return {
            "cloudinary": f"❌ Error: {str(e)}",
            "moderation": "❌ Cannot test - Connection error"
        }

# Email Verification Endpoints

@router.post("/send-verification", response_model=APIResponse)
def send_email_verification(
    request: EmailVerificationRequest,
    db: Session = Depends(get_db)
):
    """Send email verification code to the provided email address."""
    try:
        verification = email_verification_service.create_verification(db, request.email)
        
        if verification:
            return {
                "success": True,
                "message": f"Verification code sent to {request.email}",
                "data": {
                    "email": request.email,
                    "expires_in_minutes": 15
                }
            }
        else:
            # Check if max attempts reached
            status_info = email_verification_service.get_verification_status(db, request.email)
            if status_info["attempts_left"] == 0:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Maximum verification attempts reached. Please try again later."
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to send verification email. Please try again."
                )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while sending verification email"
        )


@router.post("/verify-and-login", response_model=APIResponse)
def verify_email_and_login(
    request: VerifyCodeRequest,
    db: Session = Depends(get_db),
    auth_service = Depends(get_auth_service)
):
    """Verify email code and automatically log in the user if they exist."""
    try:
        # Check if email is already verified
        is_already_verified = email_verification_service.is_email_verified(db, request.email)
        
        if is_already_verified:
            # Email is already verified, proceed to check user existence
            is_verified = True
        else:
            # First verify the email code
            is_verified = email_verification_service.verify_code(db, request.email, request.code)
            
            if not is_verified:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired verification code"
                )
        
        # Try to find existing user and log them in
        from app.repositories.user_repository import UserRepository
        user_repo = UserRepository(db)
        user = user_repo.get_by_email(request.email)
        
        if user:
            # User exists, create login tokens
            from app.utils.security import create_access_token, create_refresh_token, ACCESS_TOKEN_EXPIRE_MINUTES
            from datetime import timedelta
            
            # Update last login
            user_repo.update_last_login(user)
            
            # Create tokens
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                subject=user.id, expires_delta=access_token_expires
            )
            
            refresh_token = create_refresh_token(subject=user.id)
            
            return {
                "success": True,
                "message": "Email verified and logged in successfully",
                "data": {
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "token_type": "bearer",
                    "user": {
                        "id": user.id,
                        "email": user.email,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "university_id": user.university_id,
                        "student_id": user.student_id,
                        "is_verified": user.is_verified
                    }
                }
            }
        else:
            # User doesn't exist yet, just return verification success
            return {
                "success": True,
                "message": "Email verified successfully. Please complete registration.",
                "data": {
                    "email": request.email,
                    "verified": True,
                    "needs_registration": True
                }
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while verifying the code"
        )

@router.post("/resend-verification", response_model=APIResponse)
def resend_verification_code(
    request: ResendVerificationRequest,
    db: Session = Depends(get_db)
):
    """Resend verification code to the email address."""
    try:
        # Check current verification status
        status_info = email_verification_service.get_verification_status(db, request.email)
        
        if status_info["is_verified"]:
            return {
                "success": True,
                "message": "Email is already verified",
                "data": {
                    "email": request.email,
                    "already_verified": True
                }
            }
        
        if not status_info["can_resend"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Maximum verification attempts reached. {status_info['attempts_left']} attempts remaining."
            )
        
        success = email_verification_service.resend_verification(db, request.email)
        
        if success:
            return {
                "success": True,
                "message": f"Verification code resent to {request.email}",
                "data": {
                    "email": request.email,
                    "attempts_left": status_info["attempts_left"] - 1,
                    "expires_in_minutes": 15
                }
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to resend verification email. Please try again."
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while resending verification email"
        )

@router.get("/verification-status/{email}", response_model=APIResponse)
def get_email_verification_status(
    email: str,
    db: Session = Depends(get_db)
):
    """Get the verification status for an email address."""
    try:
        status_info = email_verification_service.get_verification_status(db, email)
        
        return {
            "success": True,
            "message": "Verification status retrieved",
            "data": {
                "email": email,
                **status_info
            }
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while checking verification status"
        )