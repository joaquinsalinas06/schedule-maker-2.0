import axios from 'axios';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration with automatic refresh
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        // If we're already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      original._retry = true;
      isRefreshing = true;

      // Try to refresh the token
      const refreshToken = localStorage.getItem('refresh_token');
      const rememberMe = localStorage.getItem('remember_me') === 'true';

      if (refreshToken && rememberMe) {
        try {
          const newToken = await authService.refreshToken();
          if (newToken) {
            processQueue(null, newToken);
            original.headers.Authorization = `Bearer ${newToken}`;
            return api(original);
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
        } finally {
          isRefreshing = false;
        }
      }

      // If refresh failed or no refresh token, show expiry message and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('remember_me');
      
      // Clear all user-specific data for security
      try {
        // Use secure storage cleanup
        import('@/utils/secureStorage').then(({ SecureStorage }) => {
          SecureStorage.clearAllUserData();
        });
      } catch (error) {
        // Fallback - remove known global keys
        localStorage.removeItem('favoriteSchedules');
        localStorage.removeItem('favoritedCombinations');
      }
      
      // Prevent redirect loops by checking current location
      if (window.location.pathname === '/auth' || window.location.pathname === '/login') {
        // If already on auth pages, just clear tokens without redirect
        processQueue(error, null);
        isRefreshing = false;
        return Promise.reject(error);
      }
      
      // Show temporary message before redirect
      const body = document.body;
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        color: white;
        font-family: system-ui, -apple-system, sans-serif;
      `;
      overlay.innerHTML = `
        <div style="text-align: center; padding: 2rem; background: #1f2937; border-radius: 1rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
          <div style="width: 48px; height: 48px; border: 4px solid #06b6d4; border-top: 4px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
          <h2 style="margin: 0 0 0.5rem; font-size: 1.25rem; font-weight: 600;">Sesión Expirada</h2>
          <p style="margin: 0; color: #9ca3af;">Redirigiendo al login...</p>
        </div>
        <style>
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      `;
      body.appendChild(overlay);
      
      setTimeout(() => {
        window.location.href = '/auth';
      }, 1500);
      
      isRefreshing = false;
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
    
    // Store tokens and user data
    localStorage.setItem('token', response.data.access_token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    
    // Store refresh token if provided and remember me is enabled
    if (response.data.refresh_token && credentials.rememberMe) {
      // Use secure storage for refresh token
      localStorage.setItem('refresh_token', response.data.refresh_token);
      localStorage.setItem('remember_me', 'true');
    }
    
    return response.data;
  },

  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post('/api/auth/register', userData);
    
    // Store token and user data
    localStorage.setItem('token', response.data.access_token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    
    return response.data;
  },

  refreshToken: async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return null;

    try {
      const response = await api.post('/api/auth/refresh', {
        refresh_token: refreshToken
      });
      
      // Update stored token and user
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      return response.data.access_token;
    } catch (error) {
      // If refresh fails, clear all tokens and redirect to login
      authService.logout();
      return null;
    }
  },

  logout: () => {
    // Clear authentication tokens and user data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('remember_me');
    localStorage.removeItem('selectedUniversity');
    
    // Clear all user-specific data for security
    try {
      // Use secure storage cleanup instead of individual items
      import('@/utils/secureStorage').then(({ SecureStorage }) => {
        SecureStorage.clearAllUserData();
      });
      
      // Also clear collaboration data
      import('@/stores/collaborationStore').then(({ useCollaborationStore }) => {
        const store = useCollaborationStore.getState();
        store.clearUserData();
      });
    } catch (error) {
      console.warn('Failed to clear user data on logout:', error);
      // Fallback - remove known global keys
      localStorage.removeItem('favoriteSchedules');
      localStorage.removeItem('favoritedCombinations');
    }
    
    window.location.href = '/auth';
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken: (): string | null => {
    return localStorage.getItem('token');
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  },

  me: async (): Promise<User> => {
    const response = await api.get('/api/auth/me');
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  },

  // Check if token is valid and refresh if needed
  validateAndRefreshToken: async (): Promise<boolean> => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      // Try to make a request to verify token validity
      await api.get('/api/auth/me');
      return true;
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Token is invalid, try to refresh if remember me is enabled
        const refreshToken = localStorage.getItem('refresh_token');
        const rememberMe = localStorage.getItem('remember_me') === 'true';
        
        if (refreshToken && rememberMe) {
          const newToken = await authService.refreshToken();
          return !!newToken;
        }
      }
      return false;
    }
  },

  // Start periodic token validation
  startTokenValidation: () => {
    // Check token validity every 5 minutes
    const interval = setInterval(async () => {
      const isValid = await authService.validateAndRefreshToken();
      if (!isValid && authService.isAuthenticated()) {
        // Token is invalid and couldn't be refreshed, but user thinks they're authenticated
        authService.logout();
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Also check on app focus/visibility change
    const handleVisibilityChange = async () => {
      if (!document.hidden && authService.isAuthenticated()) {
        await authService.validateAndRefreshToken();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Return cleanup function
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  },

  setUser: (user: User): void => {
    localStorage.setItem('user', JSON.stringify(user));
  }
};

// Auto-start token validation when the module loads
if (typeof window !== 'undefined') {
  authService.startTokenValidation();
}

export { api };