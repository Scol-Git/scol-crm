// Auth Mock Data and Services
const mockUsers = [
  {
    id: 'u5',
    email: 'admin@scolcrm.com',
    phone: '+1234567800',
    password: 'admin123',
    accountStatus: 'active',
    userType: 'admin',
    isPhoneVerified: true,
    fullName: 'Admin User',
  },
  {
    id: 'u6',
    email: 'counselor@scolcrm.com',
    phone: '+1234567801',
    password: 'counselor123',
    accountStatus: 'active',
    userType: 'counselor',
    isPhoneVerified: true,
    fullName: 'John Counselor',
  },
];

// Simulated OTP storage
let otpStore = {};

const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

export const authService = {
  // Login with email/phone and password
  async login(identifier, password) {
    await delay();

    const user = mockUsers.find(
      u => (u.email === identifier || u.phone === identifier) && u.password === password
    );

    if (!user) {
      throw new Error('Invalid credentials. Please check your email/phone and password.');
    }

    if (user.accountStatus !== 'active') {
      throw new Error('Your account is not active. Please contact support.');
    }

    // Generate mock token
    const token = btoa(JSON.stringify({ userId: user.id, exp: Date.now() + 86400000 }));

    // Store in localStorage
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify({
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      userType: user.userType,
    }));

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        userType: user.userType,
      },
    };
  },

  // Register new user
  async register(data) {
    await delay();

    const { fullName, phone, email, password } = data;

    // Check if user already exists
    const existingUser = mockUsers.find(u => u.email === email || u.phone === phone);
    if (existingUser) {
      throw new Error('User with this email or phone already exists.');
    }

    // Create new user (in real app, this would be saved to DB)
    const newUser = {
      id: `u${Date.now()}`,
      email,
      phone,
      password,
      accountStatus: 'active',
      userType: 'lead',
      isPhoneVerified: false,
      fullName,
    };

    mockUsers.push(newUser);

    // Generate OTP for verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[phone] = { otp, expiresAt: Date.now() + 300000, purpose: 'register' };

    console.log('Registration OTP:', otp); // For testing

    return {
      success: true,
      message: 'Registration successful. Please verify your phone number.',
      phone,
      sessionId: btoa(phone),
    };
  },

  // Send OTP
  async sendOtp(phone, purpose = 'verify') {
    await delay();

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[phone] = { otp, expiresAt: Date.now() + 300000, purpose };

    console.log(`OTP for ${phone}:`, otp); // For testing

    return {
      success: true,
      message: 'OTP sent successfully.',
      sessionId: btoa(phone),
    };
  },

  // Verify OTP
  async verifyOtp(phone, otp) {
    await delay();

    const stored = otpStore[phone];

    if (!stored) {
      throw new Error('OTP session expired. Please request a new OTP.');
    }

    if (Date.now() > stored.expiresAt) {
      delete otpStore[phone];
      throw new Error('OTP has expired. Please request a new OTP.');
    }

    if (stored.otp !== otp) {
      throw new Error('Invalid OTP. Please try again.');
    }

    // Mark phone as verified
    const user = mockUsers.find(u => u.phone === phone);
    if (user) {
      user.isPhoneVerified = true;
    }

    delete otpStore[phone];

    return {
      success: true,
      message: 'Phone number verified successfully.',
    };
  },

  // Forgot password - send reset link/OTP
  async forgotPassword(identifier) {
    await delay();

    const user = mockUsers.find(u => u.email === identifier || u.phone === identifier);

    if (!user) {
      // Don't reveal if user exists for security
      return {
        success: true,
        message: 'If an account exists, you will receive a password reset link.',
      };
    }

    // Generate OTP for password reset
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[user.phone] = { otp, expiresAt: Date.now() + 300000, purpose: 'reset' };

    console.log('Password Reset OTP:', otp); // For testing

    return {
      success: true,
      message: 'If an account exists, you will receive a password reset OTP.',
      phone: user.phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'), // Masked phone
      sessionId: btoa(user.phone),
    };
  },

  // Reset password
  async resetPassword(phone, otp, newPassword) {
    await delay();

    const stored = otpStore[phone];

    if (!stored || stored.purpose !== 'reset') {
      throw new Error('Invalid or expired reset session.');
    }

    if (Date.now() > stored.expiresAt) {
      delete otpStore[phone];
      throw new Error('OTP has expired. Please request a new one.');
    }

    if (stored.otp !== otp) {
      throw new Error('Invalid OTP. Please try again.');
    }

    // Update password
    const user = mockUsers.find(u => u.phone === phone);
    if (user) {
      user.password = newPassword;
    }

    delete otpStore[phone];

    return {
      success: true,
      message: 'Password reset successfully. You can now login.',
    };
  },

  // Logout
  async logout() {
    await delay(200);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    return { success: true };
  },

  // Get current user
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  // Check if authenticated
  isAuthenticated() {
    const token = localStorage.getItem('authToken');
    if (!token) return false;

    try {
      const decoded = JSON.parse(atob(token));
      return decoded.exp > Date.now();
    } catch {
      return false;
    }
  },
};

export default authService;
