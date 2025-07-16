import { apiClient } from './api.js';

// User Management Service
class UserService {
    // Get all users (SuperAdmin only)
    async getAllUsers() {
        try {
            const response = await apiClient.get('/users');
            
            // Backend already returns { success, data } format
            return response;
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to fetch users'
            };
        }
    }

    // Get user by ID
    async getUserById(userId) {
        try {
            const response = await apiClient.get(`/users/${userId}`);
            
            // Backend already returns { success, data } format
            return response;
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to fetch user'
            };
        }
    }

    // Create new user (SuperAdmin only)
    async createUser(userData) {
        try {
            const response = await apiClient.post('/users', userData);
            
            // Backend already returns { success, message, data } format
            return response;
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to create user'
            };
        }
    }

    // Update user (SuperAdmin only)
    async updateUser(userId, userData) {
        try {
            const response = await apiClient.put(`/users/${userId}`, userData);
            
            // Backend already returns { success, message, data } format
            return response;
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to update user'
            };
        }
    }

    // Delete user (SuperAdmin only)
    async deleteUser(userId) {
        try {
            const response = await apiClient.delete(`/users/${userId}`);
            
            // Backend already returns { success, message } format
            return response;
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to delete user'
            };
        }
    }

    // Toggle user status (SuperAdmin only)
    async toggleUserStatus(userId) {
        try {
            const response = await apiClient.put(`/users/${userId}/toggle-status`);
            
            // Backend already returns { success, message, data } format
            return response;
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to toggle user status'
            };
        }
    }

    // Get user statistics
    async getUserStats() {
        try {
            const response = await apiClient.get('/users/stats');
            
            // Backend already returns { success, data } format
            return response;
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to fetch user statistics'
            };
        }
    }
}

// Create and export user service instance
export const userService = new UserService(); 