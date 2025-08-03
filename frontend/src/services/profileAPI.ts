import { api } from './auth';
import { User, UserProfileUpdate } from '@/types';

export class ProfileAPI {
  static async updateProfile(profileData: UserProfileUpdate): Promise<User> {
    const response = await api.put('/api/auth/profile', profileData);
    return response.data;
  }

  static async getCurrentUser(): Promise<User> {
    const response = await api.get('/api/auth/me');
    return response.data;
  }

  static async uploadProfilePhoto(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/auth/upload-profile-photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.url;
  }
}