import { authService } from './auth'
import { User, FriendRequest, FriendRequestsResponse } from '@/types/user'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

class FriendsAPI {
  private getAuthHeaders() {
    const token = authService.getToken()
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }

  async searchUsers(query: string) {
    const response = await fetch(`${API_BASE_URL}/api/friends/search?query=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`)
    }

    return await response.json()
  }

  async sendFriendRequest(receiverId: number, message?: string) {
    const response = await fetch(`${API_BASE_URL}/api/friends/request`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        receiver_id: receiverId,
        message: message
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Error: ${response.status}`)
    }

    return await response.json()
  }

  async acceptFriendRequest(requestId: number) {
    const response = await fetch(`${API_BASE_URL}/api/friends/request/${requestId}/accept`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Error: ${response.status}`)
    }

    return await response.json()
  }

  async rejectFriendRequest(requestId: number) {
    const response = await fetch(`${API_BASE_URL}/api/friends/request/${requestId}/reject`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Error: ${response.status}`)
    }

    return await response.json()
  }

  async removeFriend(friendId: number) {
    const response = await fetch(`${API_BASE_URL}/api/friends/${friendId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Error: ${response.status}`)
    }

    return await response.json()
  }

  async getFriendsList() {
    const response = await fetch(`${API_BASE_URL}/api/friends/list`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`)
    }

    return await response.json()
  }

  async getFriendRequests() {
    const response = await fetch(`${API_BASE_URL}/api/friends/requests`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`)
    }

    return await response.json()
  }

  async getFriendProfile(friendId: number) {
    const response = await fetch(`${API_BASE_URL}/api/friends/${friendId}/profile`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Error: ${response.status}`)
    }

    return await response.json()
  }

  async getFriendSchedules(friendId: number) {
    const response = await fetch(`${API_BASE_URL}/api/friends/${friendId}/schedules`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Error: ${response.status}`)
    }

    return await response.json()
  }

  async getFriendScheduleDetail(friendId: number, scheduleId: number) {
    const response = await fetch(`${API_BASE_URL}/api/friends/${friendId}/schedules/${scheduleId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || `Error: ${response.status}`)
    }

    return await response.json()
  }
}

export const friendsAPI = new FriendsAPI()
export type { User, FriendRequest, FriendRequestsResponse }