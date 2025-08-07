import { api } from './auth'
import { User, FriendRequest, FriendRequestsResponse } from '@/types/user'

class FriendsAPI {
  async searchUsers(query: string) {
    const response = await api.get(`/api/friends/search?query=${encodeURIComponent(query)}`);
    return response.data;
  }

  async sendFriendRequest(receiverId: number, message?: string) {
    const response = await api.post('/api/friends/request', {
      receiver_id: receiverId,
      message: message
    });
    return response.data;
  }

  async acceptFriendRequest(requestId: number) {
    const response = await api.post(`/api/friends/request/${requestId}/accept`);
    return response.data;
  }

  async rejectFriendRequest(requestId: number) {
    const response = await api.post(`/api/friends/request/${requestId}/reject`);
    return response.data;
  }

  async removeFriend(friendId: number) {
    const response = await api.delete(`/api/friends/${friendId}`);
    return response.data;
  }

  async getFriendsList() {
    const response = await api.get('/api/friends/list');
    return response.data;
  }

  async getFriendRequests() {
    const response = await api.get('/api/friends/requests');
    return response.data;
  }

  async getFriendProfile(friendId: number) {
    const response = await api.get(`/api/friends/${friendId}/profile`);
    return response.data;
  }

  async getFriendSchedules(friendId: number) {
    const response = await api.get(`/api/friends/${friendId}/schedules`);
    return response.data;
  }

  async getFriendScheduleDetail(friendId: number, scheduleId: number) {
    const response = await api.get(`/api/friends/${friendId}/schedules/${scheduleId}`);
    return response.data;
  }
}

export const friendsAPI = new FriendsAPI()
export default friendsAPI