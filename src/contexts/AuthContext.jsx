import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService.js';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on app start and verify token
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const storedUser = authService.getStoredUser();
          
          if (storedUser) {
            // Verify token with backend
            const verifyResult = await authService.verifyToken();
            
            if (verifyResult.success) {
              setUser(storedUser);
            } else {
              // Token is invalid, clear auth data
              authService.clearAuthData();
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        authService.clearAuthData();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      
      if (response.success) {
        const { user: userData, token } = response.data;
        
        // Store auth data using service
        authService.storeAuthData(userData, token);
        setUser(userData);
        
        return { success: true };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Terjadi kesalahan saat login' };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if API call fails
      setUser(null);
      return { success: true };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Terjadi kesalahan saat registrasi' };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authService.updateProfile(profileData);
      
      if (response.success) {
        // Update local user state
        const updatedUser = { ...user, ...response.data.user };
        setUser(updatedUser);
        
        // Get current token and store updated user data
        const currentToken = authService.getAuthToken();
        if (currentToken) {
          authService.storeAuthData(updatedUser, currentToken);
        }
      }
      
      return response;
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, message: 'Terjadi kesalahan saat update profil' };
    }
  };

  const changePassword = async (passwordData) => {
    try {
      const response = await authService.changePassword(passwordData);
      return response;
    } catch (error) {
      console.error('Change password error:', error);
      return { 
        success: false, 
        message: error.message || 'Terjadi kesalahan saat mengubah password' 
      };
    }
  };

  const hasPermission = (requiredRole) => {
    if (!user) return false;
    
    const roleHierarchy = {
      'superadmin': 2,
      'admin': 1
    };
    
    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  };

  const isSuperAdmin = () => {
    return user?.role === 'superadmin';
  };

  const isAdmin = () => {
    return user?.role === 'admin' || user?.role === 'superadmin';
  };

  const value = {
    user,
    loading,
    login,
    logout,
    register,
    updateProfile,
    changePassword,
    hasPermission,
    isSuperAdmin,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 