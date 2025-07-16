import { apiClient } from './api.js';

// Authentication Service
class AuthService {
  // Login user
  async login(email, password) {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password
      }, { includeAuth: false });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Login failed'
      };
    }
  }

  // Register new user (SuperAdmin only)
  async register(userData) {
    try {
      const response = await apiClient.post('/auth/register', userData);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Registration failed'
      };
    }
  }

  // Get current user profile
  async getProfile() {
    try {
      const response = await apiClient.get('/auth/profile');
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to get profile'
      };
    }
  }

  // Update user profile
  async updateProfile(profileData) {
    try {
      const response = await apiClient.put('/auth/profile', profileData);
      
      if (response.success) {
        // If we successfully updated the profile, also update the stored user data
        const storedUser = this.getStoredUser();
        if (storedUser) {
          const updatedUser = { ...storedUser, ...response.data.user };
          
          // Store the updated user data
          localStorage.setItem('user_data', JSON.stringify(updatedUser));
        }
      }
      
      return {
        success: response.success,
        message: response.message,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update profile'
      };
    }
  }

  // Change password
  async changePassword(passwordData) {
    try {
      const response = await apiClient.put('/auth/change-password', passwordData);
      
      return {
        success: true,
        message: response.message || 'Password changed successfully',
        data: response.data
      };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: error.message || 'Failed to change password'
      };
    }
  }

  // Verify token
  async verifyToken() {
    try {
      const response = await apiClient.get('/auth/verify');
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Token verification failed'
      };
    }
  }

  // Logout user
  async logout() {
    try {
      await apiClient.post('/auth/logout');
      
      // Clear local storage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      
      return {
        success: true
      };
    } catch (error) {
      // Even if API call fails, clear local storage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      
      return {
        success: true // Always return success for logout
      };
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    return !!(token && userData);
  }

  // Get stored user data
  getStoredUser() {
    try {
      const userData = localStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      return null;
    }
  }

  // Store user data and token
  storeAuthData(user, token) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_data', JSON.stringify(user));
  }

  // Clear stored auth data
  clearAuthData() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  }

  // Get stored auth token
  getAuthToken() {
    return localStorage.getItem('auth_token');
  }
}

// Create and export auth service instance
export const authService = new AuthService(); 