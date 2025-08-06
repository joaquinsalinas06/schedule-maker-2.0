import { useEffect } from 'react';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { SecureStorage, migrateToSecureStorage } from '@/utils/secureStorage';

/**
 * Security hook to clear data when user changes and migrate to secure storage
 * Prevents data bleeding between different user accounts
 */
export const useUserSessionSecurity = () => {
  const clearUserData = useCollaborationStore(state => state.clearUserData);

  useEffect(() => {
    // Check for user changes and clear data if needed
    const checkUserSession = () => {
      try {
        const currentUser = localStorage.getItem('user');
        const lastKnownUser = localStorage.getItem('lastKnownUser');
        
        if (currentUser !== lastKnownUser) {
          console.log('🔐 User session changed, clearing data for security');
          
          // Clear collaboration data
          clearUserData();
          
          // Clear user-specific data
          SecureStorage.clearUserData();
          
          // Migrate any existing global data to secure storage for new user
          if (currentUser) {
            migrateToSecureStorage();
            localStorage.setItem('lastKnownUser', currentUser);
          } else {
            localStorage.removeItem('lastKnownUser');
          }
        } else if (currentUser) {
          // Same user, but check if migration is needed
          const hasFavorites = localStorage.getItem('favoriteSchedules');
          const hasOldCombinations = localStorage.getItem('favoritedCombinations');
          if (hasFavorites || hasOldCombinations) {
            console.log('🔄 Migrating existing data to secure storage');
            migrateToSecureStorage();
          }
        }
      } catch (error) {
        console.warn('Error checking user session security:', error);
      }
    };

    // Check immediately and then on storage changes
    checkUserSession();
    
    // Listen for storage changes (user switching in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'token') {
        checkUserSession();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [clearUserData]);
};
