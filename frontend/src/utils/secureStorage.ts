/**
 * Secure localStorage utility with user-specific storage keys
 * Prevents data bleeding between different user accounts
 */

// Helper function to get user-specific storage key
const getUserStorageKey = (baseKey: string): string => {
  try {
    const user = localStorage.getItem('user');
    if (user) {
      const parsedUser = JSON.parse(user);
      return `${baseKey}-user-${parsedUser.id}`;
    }
  } catch (error) {
    console.warn('Failed to get user for storage key:', error);
  }
  return `${baseKey}-anonymous`;
};

/**
 * Secure localStorage wrapper that isolates data per user
 */
export class SecureStorage {
  /**
   * Get item from user-specific localStorage
   */
  static getItem(key: string): string | null {
    try {
      const userKey = getUserStorageKey(key);
      return localStorage.getItem(userKey);
    } catch (error) {
      console.warn(`Failed to get ${key} from secure storage:`, error);
      return null;
    }
  }

  /**
   * Set item in user-specific localStorage
   */
  static setItem(key: string, value: string): void {
    try {
      const userKey = getUserStorageKey(key);
      localStorage.setItem(userKey, value);
    } catch (error) {
      console.warn(`Failed to set ${key} in secure storage:`, error);
    }
  }

  /**
   * Remove item from user-specific localStorage
   */
  static removeItem(key: string): void {
    try {
      const userKey = getUserStorageKey(key);
      localStorage.removeItem(userKey);
    } catch (error) {
      console.warn(`Failed to remove ${key} from secure storage:`, error);
    }
  }

  /**
   * Clear all user-specific data for the current user
   */
  static clearUserData(): void {
    try {
      const user = localStorage.getItem('user');
      if (!user) return;

      const parsedUser = JSON.parse(user);
      const userSuffix = `-user-${parsedUser.id}`;

      // Find all keys belonging to current user
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.endsWith(userSuffix)) {
          keysToRemove.push(key);
        }
      }

      // Remove all user-specific keys
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('🧹 Cleared user-specific data:', keysToRemove);
    } catch (error) {
      console.warn('Failed to clear user data:', error);
    }
  }

  /**
   * Clear ALL user data from ALL users (use with extreme caution)
   * This is for logout/security cleanup
   */
  static clearAllUserData(): void {
    try {
      const keysToRemove: string[] = [];
      
      // Find all user-specific keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('-user-')) {
          keysToRemove.push(key);
        }
      }

      // Remove all user-specific keys from all users
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('🧹 Security cleanup - cleared all user data:', keysToRemove);
    } catch (error) {
      console.warn('Failed to clear all user data:', error);
    }
  }
}

/**
 * Migration utility to move existing global data to user-specific storage
 * Call this once per user to migrate their existing data
 */
export const migrateToSecureStorage = (): void => {
  try {
    const user = localStorage.getItem('user');
    if (!user) return;

    // Keys that should be migrated to user-specific storage
    const keysToMigrate = [
      'favoriteSchedules',
      'favoritedCombinations',
      'selectedSections',
      'generatedSchedules',
      'viewingFavoriteSchedule'
    ];

    keysToMigrate.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        // Move to secure storage
        SecureStorage.setItem(key, value);
        // Remove from global storage
        localStorage.removeItem(key);
        console.log(`✅ Migrated ${key} to secure storage`);
      }
    });
  } catch (error) {
    console.warn('Failed to migrate to secure storage:', error);
  }
};
