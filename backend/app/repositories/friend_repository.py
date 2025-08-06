from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_

from app.models.friendship import FriendRequest, Friendship
from app.models.user import User
from app.repositories.base import BaseRepository


class FriendRequestRepository(BaseRepository[FriendRequest]):
    def __init__(self, db: Session):
        super().__init__(db, FriendRequest)

    def get_pending_requests_for_user(self, user_id: int) -> List[FriendRequest]:
        """Get all pending friend requests received by a user"""
        return self.db.query(FriendRequest).options(
            joinedload(FriendRequest.sender).joinedload(User.university)
        ).filter(
            FriendRequest.receiver_id == user_id,
            FriendRequest.status == 'pending'
        ).all()

    def get_sent_requests_by_user(self, user_id: int) -> List[FriendRequest]:
        """Get all friend requests sent by a user"""
        return self.db.query(FriendRequest).options(
            joinedload(FriendRequest.receiver).joinedload(User.university)
        ).filter(
            FriendRequest.sender_id == user_id
        ).all()

    def get_request_between_users(self, user1_id: int, user2_id: int) -> Optional[FriendRequest]:
        """Check if there's already a friend request between two users"""
        return self.db.query(FriendRequest).filter(
            or_(
                and_(FriendRequest.sender_id == user1_id, FriendRequest.receiver_id == user2_id),
                and_(FriendRequest.sender_id == user2_id, FriendRequest.receiver_id == user1_id)
            )
        ).first()

    def accept_request(self, request_id: int) -> FriendRequest:
        """Accept a friend request and update status"""
        request = self.get(request_id)
        if request:
            request.status = 'accepted'
            request.responded_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(request)
        return request

    def reject_request(self, request_id: int) -> FriendRequest:
        """Reject a friend request and update status"""
        request = self.get(request_id)
        if request:
            request.status = 'rejected'
            request.responded_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(request)
        return request


class FriendshipRepository(BaseRepository[Friendship]):
    def __init__(self, db: Session):
        super().__init__(db, Friendship)

    def get_user_friends(self, user_id: int) -> List[User]:
        """Get all friends of a user"""
        friends = self.db.query(User).join(
            Friendship, 
            User.id == Friendship.friend_id
        ).options(
            joinedload(User.university)
        ).filter(
            Friendship.user_id == user_id
        ).all()
        return friends

    def are_friends(self, user1_id: int, user2_id: int) -> bool:
        """Check if two users are friends"""
        friendship = self.db.query(Friendship).filter(
            or_(
                and_(Friendship.user_id == user1_id, Friendship.friend_id == user2_id),
                and_(Friendship.user_id == user2_id, Friendship.friend_id == user1_id)
            )
        ).first()
        return friendship is not None

    def create_friendship(self, user1_id: int, user2_id: int, request_id: int = None) -> None:
        """Create mutual friendship between two users"""
        # Create friendship from user1 to user2
        friendship1 = Friendship(
            user_id=user1_id,
            friend_id=user2_id,
            created_from_request_id=request_id
        )
        
        # Create friendship from user2 to user1
        friendship2 = Friendship(
            user_id=user2_id,
            friend_id=user1_id,
            created_from_request_id=request_id
        )
        
        self.db.add(friendship1)
        self.db.add(friendship2)
        self.db.commit()

    def remove_friendship(self, user1_id: int, user2_id: int) -> bool:
        """Remove friendship between two users"""
        deleted_count = self.db.query(Friendship).filter(
            or_(
                and_(Friendship.user_id == user1_id, Friendship.friend_id == user2_id),
                and_(Friendship.user_id == user2_id, Friendship.friend_id == user1_id)
            )
        ).delete()
        
        self.db.commit()
        return deleted_count > 0

    def get_friend_count(self, user_id: int) -> int:
        """Get the number of friends a user has"""
        return self.db.query(Friendship).filter(Friendship.user_id == user_id).count()

    def search_friends(self, user_id: int, query: str) -> List[User]:
        """Search among user's friends"""
        if not query:
            return self.get_user_friends(user_id)
        
        friends = self.db.query(User).join(
            Friendship,
            User.id == Friendship.friend_id
        ).options(
            joinedload(User.university)
        ).filter(
            Friendship.user_id == user_id,
            or_(
                User.first_name.ilike(f"%{query}%"),
                User.last_name.ilike(f"%{query}%"),
                User.nickname.ilike(f"%{query}%"),
                User.email.ilike(f"%{query}%"),
                User.student_id.ilike(f"%{query}%")
            )
        ).all()
        
        return friends