import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { isAdmin as userIsAdmin } from '../services/apiClient';

const AuthContext = createContext(null);

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

  useEffect(() => {
    // Check for existing session
    const currentUser = authService.getCurrentUser();
    if (currentUser && authService.isAuthenticated()) {
      setUser(currentUser);
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    const result = await authService.login(credentials);
    setUser(result.user);
    return result;
  };

  const register = async (data) => {
    return await authService.register(data);
  };

  const completeOtpVerification = async (otpAccessToken, otp) => {
    const result = await authService.verifyOtp(otpAccessToken, otp);
    setUser(result.user);
    return result;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    completeOtpVerification,
    logout,
    isAuthenticated: !!user,
    // ADMIN can upload, publish, delete and edit; COUNSELLOR is read-only and
    // never sees drafts. The backend enforces this too - this only drives the UI.
    isAdmin: userIsAdmin(user),
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
