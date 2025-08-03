import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session, joinedload

from app.database.connection import get_db
from app.models import User
from app.utils.security import SECRET_KEY, ALGORITHM
from app.services.auth_service import AuthService
from app.services.schedule_service import ScheduleService
from app.services.course_service import CourseService
from app.services.collaboration_service import CollaborationService

security = HTTPBearer()

def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).options(joinedload(User.university)).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_user_websocket(token: str, db: Session) -> Optional[User]:
    """Get current user for WebSocket connections"""
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Decoding JWT token for WebSocket: {token[:20]}...")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.warning("No 'sub' field found in JWT payload")
            return None
            
        logger.info(f"JWT decoded successfully, user_id: {user_id}")
        user = db.query(User).options(joinedload(User.university)).filter(User.id == int(user_id)).first()
        
        if user:
            logger.info(f"User found: {user.id} ({user.email})")
        else:
            logger.warning(f"No user found with ID: {user_id}")
            
        return user
        
    except JWTError as e:
        logger.error(f"JWT decode error: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error in WebSocket auth: {str(e)}")
        return None

# Service dependencies
def get_auth_service(db: Session = Depends(get_db)):
    return AuthService(db)

def get_schedule_service(db: Session = Depends(get_db)):
    return ScheduleService(db)

def get_course_service(db: Session = Depends(get_db)):
    return CourseService(db)

def get_collaboration_service(db: Session = Depends(get_db)):
    return CollaborationService(db)