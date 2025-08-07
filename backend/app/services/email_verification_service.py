import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session
from ..models.email_verification import EmailVerification
from ..services.email_service import email_service
from ..utils.config import settings
import logging

logger = logging.getLogger(__name__)

class EmailVerificationService:
    """Service for handling email verification operations."""
    
    def __init__(self):
        self.expire_minutes = settings.EMAIL_VERIFICATION_EXPIRE_MINUTES
        self.max_attempts = settings.EMAIL_VERIFICATION_MAX_ATTEMPTS
    
    def generate_verification_code(self) -> str:
        """Generate a 6-digit verification code."""
        return ''.join(random.choices(string.digits, k=6))
    
    def create_verification(self, db: Session, email: str) -> Optional[EmailVerification]:
        """
        Create a new email verification record and send verification email.
        
        Args:
            db: Database session
            email: Email address to verify
            
        Returns:
            EmailVerification object if successful, None if failed
        """
        try:
            # Clean up any existing verifications for this email (expired or not)
            self.cleanup_all_verifications_for_email(db, email)
            
            # Create new verification
            verification_code = self.generate_verification_code()
            verification = EmailVerification(
                email=email,
                verification_code=verification_code,
                expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=self.expire_minutes)
            )
            db.add(verification)
            
            # Commit the verification record
            db.commit()
            db.refresh(verification)
            
            # Send verification email
            email_sent = email_service.send_verification_email(email, verification.verification_code)
            
            if not email_sent:
                logger.error(f"Failed to send verification email to: {email}")
                # Don't delete the verification record, user might try again
                return None
            
            logger.info(f"Verification email sent to: {email}")
            return verification
            
        except Exception as e:
            logger.error(f"Error creating verification for {email}: {str(e)}")
            db.rollback()
            return None
    
    def verify_code(self, db: Session, email: str, code: str) -> bool:
        """
        Verify the provided code for the given email.
        
        Args:
            db: Database session
            email: Email address
            code: Verification code to check
            
        Returns:
            True if verification successful, False otherwise
        """
        try:
            # First, find any active verification for this email
            now = datetime.now(timezone.utc)
            verification = db.query(EmailVerification).filter(
                EmailVerification.email == email,
                EmailVerification.is_verified == False,
                EmailVerification.expires_at > now.replace(tzinfo=None)  # Compare as naive for DB compatibility
            ).first()
            
            if not verification:
                logger.warning(f"No active verification found for email: {email}")
                return False
            
            # Check if too many attempts have been made
            if verification.attempts >= self.max_attempts:
                logger.warning(f"Too many verification attempts for email: {email}")
                return False
            
            # Check if the code matches
            if verification.verification_code != code:
                # Increment attempt counter for failed verification
                verification.attempts += 1
                verification.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
                db.commit()
                logger.warning(f"Invalid verification code for email: {email}. Attempts: {verification.attempts}/{self.max_attempts}")
                return False
            
            # Mark as verified
            verification.is_verified = True
            verification.verified_at = datetime.now(timezone.utc).replace(tzinfo=None)
            verification.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
            
            # Also update the user's verification status
            from ..repositories.user_repository import UserRepository
            user_repo = UserRepository(db)
            user = user_repo.get_by_email(email)
            if user:
                user.is_verified = True
                user_repo.db.commit()
            
            db.commit()
            logger.info(f"Email verification successful for: {email}")
            return True
            
        except Exception as e:
            logger.error(f"Error verifying code for {email}: {str(e)}")
            db.rollback()
            return False
    
    def is_email_verified(self, db: Session, email: str) -> bool:
        """
        Check if an email address has been verified.
        
        Args:
            db: Database session
            email: Email address to check
            
        Returns:
            True if email is verified, False otherwise
        """
        verification = db.query(EmailVerification).filter(
            EmailVerification.email == email,
            EmailVerification.is_verified == True
        ).first()
        
        return verification is not None
    
    def resend_verification(self, db: Session, email: str) -> bool:
        """
        Resend verification code to an email address.
        
        Args:
            db: Database session
            email: Email address
            
        Returns:
            True if resend successful, False otherwise
        """
        verification = self.create_verification(db, email)
        return verification is not None
    
    def cleanup_expired_verifications(self, db: Session, email: str = None) -> None:
        """
        Clean up expired verification records.
        
        Args:
            db: Database session
            email: Optional specific email to clean up, if None cleans all expired
        """
        try:
            now = datetime.now(timezone.utc)
            query = db.query(EmailVerification).filter(
                EmailVerification.expires_at <= now.replace(tzinfo=None)  # Compare as naive for DB compatibility
            )
            
            if email:
                query = query.filter(EmailVerification.email == email)
            
            expired_count = query.count()
            if expired_count > 0:
                query.delete()
                db.commit()
                logger.info(f"Cleaned up {expired_count} expired verification records")
        
        except Exception as e:
            logger.error(f"Error cleaning up expired verifications: {str(e)}")
            db.rollback()
    
    def cleanup_all_verifications_for_email(self, db: Session, email: str) -> None:
        """
        Clean up ALL verification records for a specific email (expired or not).
        Used when creating a new verification to avoid confusion.
        
        Args:
            db: Database session
            email: Email to clean up verifications for
        """
        try:
            deleted_count = db.query(EmailVerification).filter(
                EmailVerification.email == email
            ).delete()
            
            if deleted_count > 0:
                db.commit()
                logger.info(f"Cleaned up {deleted_count} verification records for {email}")
        
        except Exception as e:
            logger.error(f"Error cleaning up verifications for {email}: {str(e)}")
            db.rollback()
    
    def get_verification_status(self, db: Session, email: str) -> dict:
        """
        Get detailed verification status for an email.
        
        Args:
            db: Database session
            email: Email address
            
        Returns:
            Dictionary with verification status details
        """
        verification = db.query(EmailVerification).filter(
            EmailVerification.email == email
        ).order_by(EmailVerification.created_at.desc()).first()
        
        if not verification:
            return {
                "has_verification": False,
                "is_verified": False,
                "can_resend": True,
                "attempts_left": self.max_attempts
            }
        
        # Handle both timezone-aware and timezone-naive datetimes
        now = datetime.now(timezone.utc)
        expires_at = verification.expires_at
        
        # If expires_at is naive, treat it as UTC
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
            
        is_expired = expires_at <= now
        attempts_left = max(0, self.max_attempts - verification.attempts)
        
        return {
            "has_verification": True,
            "is_verified": verification.is_verified,
            "is_expired": is_expired,
            "can_resend": not verification.is_verified and attempts_left > 0,
            "attempts_left": attempts_left,
            "expires_at": verification.expires_at.isoformat() + "Z" if verification.expires_at else None,
            "created_at": verification.created_at.isoformat() + "Z" if verification.created_at else None
        }

# Global service instance
email_verification_service = EmailVerificationService()
