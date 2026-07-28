// Auth Services - backed by the real SCOL backend /auth endpoints
import { api, tokenStorage } from './apiClient';

export const authService = {
  // Login with email or phone + password
  async login({ email, phone, password }) {
    const data = await api.post('/auth/login', { email, phone, password }, { auth: false });
    tokenStorage.setSession(data);
    return data;
  },

  // Register a new lead (phone-based; no email field on the backend)
  async register({ phone, password, fullName }) {
    return api.post('/auth/register', { phone, password, fullName }, { auth: false });
  },

  // Verify OTP for either registration (phone_verify) or password reset.
  // Both purposes return full auth tokens.
  async verifyOtp(otpAccessToken, otp) {
    const data = await api.post('/auth/verify-otp', { otp }, { auth: false, token: otpAccessToken });
    tokenStorage.setSession(data);
    return data;
  },

  // Resend OTP using the short-lived OTP access token
  async resendOtp(otpAccessToken) {
    return api.get('/auth/resend-otp', { auth: false, token: otpAccessToken });
  },

  // Initiate password reset - new password is submitted up front,
  // applied once the OTP is verified via verifyOtp(purpose=password_reset)
  async forgotPassword({ phone, newPassword }) {
    return api.post('/auth/forgot-password', { phone, newPassword }, { auth: false });
  },

  // Logout current session
  async logout() {
    try {
      await api.get('/auth/logout');
    } finally {
      tokenStorage.clear();
    }
  },

  // Get current user from storage
  getCurrentUser() {
    return tokenStorage.getUser();
  },

  // Check if authenticated
  isAuthenticated() {
    return !!tokenStorage.getAccessToken();
  },
};

export default authService;
