from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import BaseModel


class FriendRequest(BaseModel):
    __tablename__ = "friend_requests"
    
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default='pending')  # pending, accepted, rejected
    message = Column(String(500))  # Optional message when sending request
    responded_at = Column(DateTime)
    
    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_friend_requests")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_friend_requests")
    
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )


class Friendship(BaseModel):
    __tablename__ = "friendships"
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    friend_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_from_request_id = Column(Integer, ForeignKey("friend_requests.id"))
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="friendships")
    friend = relationship("User", foreign_keys=[friend_id])
    
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )