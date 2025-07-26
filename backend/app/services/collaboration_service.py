import secrets
import string
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException, status

from app.models.collaboration import (
    CollaborativeSession, SessionParticipant, ScheduleShare, 
    ScheduleComparison, ScheduleComment
)
from app.models.user import User
from app.models.schedule import Schedule
from app.models.university import University

class CollaborationService:
    
    @staticmethod
    def generate_session_code() -> str:
        """Generate a unique session code"""
        return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
    
    @staticmethod
    def generate_share_token() -> str:
        """Generate a unique share token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def create_collaborative_session(
        db: Session,
        name: str,
        description: str,
        university_id: int,
        created_by: int,
        max_participants: int = 10,
        duration_hours: int = 24
    ) -> CollaborativeSession:
        """Create a new collaborative session"""
        
        # Verify user belongs to the university
        user = db.query(User).filter(User.id == created_by).first()
        if not user or user.university_id != university_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not belong to this university"
            )
        
        # Generate unique session code
        session_code = CollaborationService.generate_session_code()
        while db.query(CollaborativeSession).filter(
            CollaborativeSession.session_code == session_code
        ).first():
            session_code = CollaborationService.generate_session_code()
        
        # Create session
        session = CollaborativeSession(
            name=name,
            description=description,
            university_id=university_id,
            created_by=created_by,
            session_code=session_code,
            max_participants=max_participants,
            expires_at=datetime.utcnow() + timedelta(hours=duration_hours)
        )
        
        db.add(session)
        db.flush()
        
        # Add creator as participant
        participant = SessionParticipant(
            session_id=session.id,
            user_id=created_by,
            role='creator'
        )
        db.add(participant)
        db.commit()
        db.refresh(session)
        
        return session
    
    @staticmethod
    def join_session(db: Session, session_code: str, user_id: int) -> SessionParticipant:
        """Join a collaborative session"""
        
        # Get session
        session = db.query(CollaborativeSession).filter(
            and_(
                CollaborativeSession.session_code == session_code,
                CollaborativeSession.is_active == True,
                CollaborativeSession.expires_at > datetime.utcnow()
            )
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or expired"
            )
        
        # Verify user belongs to same university
        user = db.query(User).filter(User.id == user_id).first()
        if not user or user.university_id != session.university_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User must belong to the same university"
            )
        
        # Check if already a participant
        existing = db.query(SessionParticipant).filter(
            and_(
                SessionParticipant.session_id == session.id,
                SessionParticipant.user_id == user_id,
                SessionParticipant.is_active == True
            )
        ).first()
        
        if existing:
            return existing
        
        # Check participant limit
        active_count = db.query(SessionParticipant).filter(
            and_(
                SessionParticipant.session_id == session.id,
                SessionParticipant.is_active == True
            )
        ).count()
        
        if active_count >= session.max_participants:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Session is full"
            )
        
        # Add participant
        participant = SessionParticipant(
            session_id=session.id,
            user_id=user_id,
            role='participant'
        )
        db.add(participant)
        db.commit()
        db.refresh(participant)
        
        return participant
    
    @staticmethod
    def get_session_details(db: Session, session_code: str, user_id: int) -> Dict[str, Any]:
        """Get collaborative session details"""
        
        session = db.query(CollaborativeSession).filter(
            CollaborativeSession.session_code == session_code
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check if user is participant
        participant = db.query(SessionParticipant).filter(
            and_(
                SessionParticipant.session_id == session.id,
                SessionParticipant.user_id == user_id,
                SessionParticipant.is_active == True
            )
        ).first()
        
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a participant in this session"
            )
        
        # Get all participants with user details
        participants = db.query(SessionParticipant).join(User).filter(
            and_(
                SessionParticipant.session_id == session.id,
                SessionParticipant.is_active == True
            )
        ).all()
        
        participant_data = []
        for p in participants:
            participant_data.append({
                "user_id": p.user_id,
                "name": f"{p.user.first_name} {p.user.last_name}",
                "email": p.user.email,
                "role": p.role,
                "joined_at": p.joined_at
            })
        
        return {
            "id": session.id,
            "name": session.name,
            "description": session.description,
            "session_code": session.session_code,
            "university_id": session.university_id,
            "created_by": session.created_by,
            "is_active": session.is_active,
            "max_participants": session.max_participants,
            "current_schedule_data": session.current_schedule_data,
            "expires_at": session.expires_at,
            "participants": participant_data
        }
    
    @staticmethod
    def share_schedule(
        db: Session,
        schedule_id: int,
        shared_by: int,
        shared_with: Optional[int] = None,
        permissions: str = 'view',
        expires_hours: Optional[int] = None
    ) -> ScheduleShare:
        """Share a schedule with another user or publicly"""
        
        # Verify schedule ownership
        schedule = db.query(Schedule).filter(
            and_(
                Schedule.id == schedule_id,
                Schedule.user_id == shared_by
            )
        ).first()
        
        if not schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found"
            )
        
        # If sharing with specific user, verify they exist and are from same university
        if shared_with:
            recipient = db.query(User).filter(User.id == shared_with).first()
            sharer = db.query(User).filter(User.id == shared_by).first()
            
            if not recipient:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Recipient user not found"
                )
            
            if recipient.university_id != sharer.university_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Can only share with users from the same university"
                )
        
        # Generate share token
        share_token = CollaborationService.generate_share_token()
        
        # Set expiration
        expires_at = None
        if expires_hours:
            expires_at = datetime.utcnow() + timedelta(hours=expires_hours)
        
        share = ScheduleShare(
            schedule_id=schedule_id,
            shared_by=shared_by,
            shared_with=shared_with,
            share_token=share_token,
            permissions=permissions,
            expires_at=expires_at
        )
        
        db.add(share)
        db.commit()
        db.refresh(share)
        
        return share
    
    @staticmethod
    def get_shared_schedule(db: Session, share_token: str, user_id: int) -> Dict[str, Any]:
        """Access a shared schedule"""
        
        share = db.query(ScheduleShare).filter(
            and_(
                ScheduleShare.share_token == share_token,
                ScheduleShare.is_active == True,
                or_(
                    ScheduleShare.expires_at.is_(None),
                    ScheduleShare.expires_at > datetime.utcnow()
                )
            )
        ).first()
        
        if not share:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shared schedule not found or expired"
            )
        
        # Check permissions
        if share.shared_with and share.shared_with != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this schedule"
            )
        
        # Get schedule with details
        schedule = db.query(Schedule).filter(Schedule.id == share.schedule_id).first()
        
        return {
            "schedule": schedule,
            "share": share,
            "permissions": share.permissions
        }
    
    @staticmethod
    def add_schedule_to_comparison(
        db: Session,
        session_id: int,
        user_id: int,
        schedule_id: int
    ) -> ScheduleComparison:
        """Add a schedule to session comparison"""
        
        # Verify user is participant
        participant = db.query(SessionParticipant).filter(
            and_(
                SessionParticipant.session_id == session_id,
                SessionParticipant.user_id == user_id,
                SessionParticipant.is_active == True
            )
        ).first()
        
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a participant in this session"
            )
        
        # Verify schedule ownership
        schedule = db.query(Schedule).filter(
            and_(
                Schedule.id == schedule_id,
                Schedule.user_id == user_id
            )
        ).first()
        
        if not schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found"
            )
        
        # Check if already added
        existing = db.query(ScheduleComparison).filter(
            and_(
                ScheduleComparison.session_id == session_id,
                ScheduleComparison.schedule_id == schedule_id
            )
        ).first()
        
        if existing:
            return existing
        
        comparison = ScheduleComparison(
            session_id=session_id,
            user_id=user_id,
            schedule_id=schedule_id
        )
        
        db.add(comparison)
        db.commit()
        db.refresh(comparison)
        
        return comparison
