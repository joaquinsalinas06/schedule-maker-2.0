from sqlalchemy import Column, String, Integer, DateTime, Boolean
from sqlalchemy.sql import func
from .base import BaseModel
import random
import string
from datetime import datetime, timedelta

class EmailVerification(BaseModel):
    __tablename__ = "email_verifications"
    
    email = Column(String(255), nullable=False, index=True)
    verification_code = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)
    
    @classmethod
    def generate_code(cls):
        """Generate a 6-digit verification code"""
        return ''.join(random.choices(string.digits, k=6))
    
    @classmethod
    def create_verification(cls, email: str, expiry_minutes: int = 15):
        """Create a new email verification entry"""
        return cls(
            email=email.lower(),
            verification_code=cls.generate_code(),
            expires_at=datetime.utcnow() + timedelta(minutes=expiry_minutes),
            is_used=False,
            is_verified=False,
            attempts=0
        )
    
    def is_expired(self):
        """Check if the verification code has expired"""
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self):
        """Check if the verification code is still valid"""
        return not self.is_used and not self.is_expired() and self.attempts < self.max_attempts
    
    def increment_attempts(self):
        """Increment the number of attempts"""
        self.attempts += 1
    
    def mark_as_used(self):
        """Mark the verification code as used"""
        self.is_used = True
