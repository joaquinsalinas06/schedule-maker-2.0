import axios from 'axios';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '@/types';
import { authSessionManager } from '@/lib/authSessionManager';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add valid token to every request using the session manager
api.interceptors.request.use(async (config) => {
  // For refresh requests, don't try to get a valid token (avoid infinite loop)
  if (config.url?.includes('/auth/refresh')) {
    return config;
  }

  const token = await authSessionManager.getValidToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors — session manager already tried to refresh in the request interceptor,
// so if we still get 401, the session is truly dead
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Prevent redirect loops
      if (typeof window !== 'undefined' &&
          window.location.pathname !== '/auth' &&
          window.location.pathname !== '/login') {
        authService.logout();
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (credentials: LoginRequest & { rememberMe?: boolean }): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/login', {
      email: credentials.email,
      password: credentials.password,
      remember_me: credentials.rememberMe || false
    });
    
    // Save session via the manager (handles localStorage + cookie + auto-refresh)
    authSessionManager.setSession(
      response.data.access_token,
      response.data.refresh_token,
      response.data.user
    );

    // Keep remember_me preference for reference
    if (credentials.rememberMe) {
      localStorage.setItem('remember_me', 'true');
    }
    
    return response.data;
  },

  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/register', userData);
    
    // Save session via the manager
    authSessionManager.setSession(
      response.data.access_token,
      response.data.refresh_token,
      response.data.user
    );
    
    return response.data;
  },

  refreshToken: async (): Promise<string | null> => {
    return authSessionManager.getValidToken();
  },

  logout: () => {
    // Clear all user-specific data for security
    try {
      import('@/utils/secureStorage').then(({ SecureStorage }) => {
        SecureStorage.clearAllUserData();
      });
      
      import('@/stores/collaborationStore').then(({ useCollaborationStore }) => {
        const store = useCollaborationStore.getState();
        store.clearUserData();
      });
    } catch (error) {
      console.warn('Failed to clear user data on logout:', error);
      localStorage.removeItem('favoriteSchedules');
      localStorage.removeItem('favoritedCombinations');
    }

    // Clear selected university
    localStorage.removeItem('selectedUniversity');

    // Clear session via manager (handles localStorage + cookie + stops auto-refresh)
    authSessionManager.clearSession();
    
    window.location.href = '/auth';
  },

  getCurrentUser: (): User | null => {
    const session = authSessionManager.getSession();
    return session ? session.user as unknown as User : null;
  },

  getToken: (): string | null => {
    const session = authSessionManager.getSession();
    return session ? session.access_token : null;
  },

  isAuthenticated: (): boolean => {
    return authSessionManager.isAuthenticated();
  },

  me: async (): Promise<User> => {
    const response = await api.get('/api/auth/me');
    // Update the stored user data
    const session = authSessionManager.getSession();
    if (session) {
      authSessionManager.setSession(session.access_token, session.refresh_token, response.data);
    }
    return response.data;
  },

  setUser: (user: User): void => {
    const session = authSessionManager.getSession();
    if (session) {
      authSessionManager.setSession(session.access_token, session.refresh_token, user as unknown as Record<string, unknown>);
    } else {
      // Fallback for cases where session isn't fully set up
      localStorage.setItem("user", JSON.stringify(user));
    }
  }
};

export { api };