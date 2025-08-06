from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.user import User
from app.models.friendship import FriendRequest, Friendship
from app.repositories.friend_repository import FriendRequestRepository, FriendshipRepository
from app.repositories.user_repository import UserRepository


class FriendService:
    def __init__(self, db: Session):
        self.db = db
        self.friend_request_repo = FriendRequestRepository(db)
        self.friendship_repo = FriendshipRepository(db)
        self.user_repo = UserRepository(db)

    def search_users(self, query: str, current_user_id: int, university_id: int = None) -> List[Dict[str, Any]]:
        """Search for users to potentially add as friends"""
        if len(query) < 2:
            return []

        # Build query
        db_query = self.db.query(User).options(joinedload(User.university))
        
        # Filter by university if specified, otherwise use current user's university
        if university_id:
            db_query = db_query.filter(User.university_id == university_id)
        else:
            current_user = self.user_repo.get(current_user_id)
            if current_user:
                db_query = db_query.filter(User.university_id == current_user.university_id)

        # Search by name, nickname, email, or student ID
        search_filter = db_query.filter(
            User.id != current_user_id,  # Exclude current user
            User.is_active == True,
        ).filter(
            User.first_name.ilike(f"%{query}%") |
            User.last_name.ilike(f"%{query}%") |
            User.nickname.ilike(f"%{query}%") |
            User.email.ilike(f"%{query}%") |
            User.student_id.ilike(f"%{query}%")
        ).limit(20)

        users = search_filter.all()
        
        # Add friendship status for each user
        result = []
        for user in users:
            friendship_status = self._get_friendship_status(current_user_id, user.id)
            result.append({
                "id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "nickname": user.nickname,
                "email": user.email,
                "student_id": user.student_id,
                "profile_photo": user.profile_photo,
                "university": {
                    "id": user.university.id,
                    "name": user.university.name,
                    "short_name": user.university.short_name
                } if user.university else None,
                "friendship_status": friendship_status
            })
        
        return result

    def send_friend_request(self, sender_id: int, receiver_id: int, message: str = None) -> FriendRequest:
        """Send a friend request to another user"""
        # Validate users exist
        sender = self.user_repo.get(sender_id)
        receiver = self.user_repo.get(receiver_id)
        
        if not sender or not receiver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )

        if sender_id == receiver_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No puedes enviarte una solicitud a ti mismo"
            )

        # Check if they're already friends
        if self.friendship_repo.are_friends(sender_id, receiver_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya son amigos"
            )

        # Check if there's already a pending request
        existing_request = self.friend_request_repo.get_request_between_users(sender_id, receiver_id)
        if existing_request:
            if existing_request.status == 'pending':
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ya existe una solicitud pendiente"
                )

        # Create friend request
        request_data = {
            "sender_id": sender_id,
            "receiver_id": receiver_id,
            "message": message,
            "status": "pending"
        }
        
        return self.friend_request_repo.create(request_data)

    def accept_friend_request(self, request_id: int, user_id: int) -> FriendRequest:
        """Accept a friend request"""
        request = self.friend_request_repo.get(request_id)
        
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Solicitud no encontrada"
            )

        if request.receiver_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para aceptar esta solicitud"
            )

        if request.status != 'pending':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La solicitud ya fue respondida"
            )

        # Accept the request
        accepted_request = self.friend_request_repo.accept_request(request_id)
        
        # Create mutual friendship
        self.friendship_repo.create_friendship(
            request.sender_id, 
            request.receiver_id, 
            request_id
        )
        
        return accepted_request

    def reject_friend_request(self, request_id: int, user_id: int) -> FriendRequest:
        """Reject a friend request"""
        request = self.friend_request_repo.get(request_id)
        
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Solicitud no encontrada"
            )

        if request.receiver_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para rechazar esta solicitud"
            )

        if request.status != 'pending':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La solicitud ya fue respondida"
            )

        return self.friend_request_repo.reject_request(request_id)

    def remove_friend(self, user_id: int, friend_id: int) -> bool:
        """Remove a friend"""
        if not self.friendship_repo.are_friends(user_id, friend_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No son amigos"
            )

        return self.friendship_repo.remove_friendship(user_id, friend_id)

    def get_user_friends(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all friends of a user"""
        friends = self.friendship_repo.get_user_friends(user_id)
        
        result = []
        for friend in friends:
            result.append({
                "id": friend.id,
                "first_name": friend.first_name,
                "last_name": friend.last_name,
                "nickname": friend.nickname,
                "email": friend.email,
                "student_id": friend.student_id,
                "profile_photo": friend.profile_photo,
                "last_login": friend.last_login.isoformat() if friend.last_login else None,
                "university": {
                    "id": friend.university.id,
                    "name": friend.university.name,
                    "short_name": friend.university.short_name
                } if friend.university else None
            })
        
        return result

    def get_pending_requests(self, user_id: int) -> Dict[str, List[Dict[str, Any]]]:
        """Get pending friend requests (both sent and received)"""
        received_requests = self.friend_request_repo.get_pending_requests_for_user(user_id)
        sent_requests = self.friend_request_repo.get_sent_requests_by_user(user_id)
        
        received = []
        for request in received_requests:
            received.append({
                "id": request.id,
                "sender": {
                    "id": request.sender.id,
                    "first_name": request.sender.first_name,
                    "last_name": request.sender.last_name,
                    "nickname": request.sender.nickname,
                    "profile_photo": request.sender.profile_photo,
                    "university": {
                        "short_name": request.sender.university.short_name
                    } if request.sender.university else None
                },
                "message": request.message,
                "created_at": request.created_at.isoformat()
            })

        sent = []
        for request in sent_requests:
            if request.status == 'pending':
                sent.append({
                    "id": request.id,
                    "receiver": {
                        "id": request.receiver.id,
                        "first_name": request.receiver.first_name,
                        "last_name": request.receiver.last_name,
                        "nickname": request.receiver.nickname,
                        "profile_photo": request.receiver.profile_photo,
                        "university": {
                            "short_name": request.receiver.university.short_name
                        } if request.receiver.university else None
                    },
                    "message": request.message,
                    "created_at": request.created_at.isoformat()
                })

        return {
            "received": received,
            "sent": sent
        }

    def _get_friendship_status(self, current_user_id: int, other_user_id: int) -> str:
        """Get friendship status between two users"""
        # Check if they're friends
        if self.friendship_repo.are_friends(current_user_id, other_user_id):
            return "friends"
        
        # Check for pending requests
        request = self.friend_request_repo.get_request_between_users(current_user_id, other_user_id)
        if request:
            if request.status == 'pending':
                if request.sender_id == current_user_id:
                    return "request_sent"
                else:
                    return "request_received"
            elif request.status == 'rejected':
                return "rejected"
        
        return "none"

    def get_friend_profile(self, user_id: int, friend_id: int) -> Dict[str, Any]:
        """Get detailed profile of a friend"""
        # Verify they are friends
        if not self.friendship_repo.are_friends(user_id, friend_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo puedes ver perfiles de tus amigos"
            )

        friend = self.user_repo.get(friend_id)
        if not friend:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )

        # Get friend's schedules count (using relationship collection)
        # Note: If we need to filter for public schedules later, we can add that logic

        return {
            "id": friend.id,
            "first_name": friend.first_name,
            "last_name": friend.last_name,
            "nickname": friend.nickname,
            "description": friend.description,
            "profile_photo": friend.profile_photo,
            "student_id": friend.student_id,
            "last_login": friend.last_login.isoformat() if friend.last_login else None,
            "university": {
                "id": friend.university.id,
                "name": friend.university.name,
                "short_name": friend.university.short_name
            } if friend.university else None,
            "stats": {
                "friend_count": self.friendship_repo.get_friend_count(friend_id),
                "schedules_count": len(friend.schedules)
            }
        }