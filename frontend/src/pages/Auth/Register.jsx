import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Phone, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';
import logoWhite from '../../assets/Logo/logo_white.png';
import logoRed from '../../assets/Logo/logo_red.png';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s-]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setError('');

    try {
      const result = await register(formData);
      // Navigate to OTP verification
      navigate('/verify-otp', {
        state: {
          phone: formData.phone,
          sessionId: result.sessionId,
          purpose: 'register'
        }
      });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    backgroundColor: colors.appBg,
  };

  const leftPanelStyle = {
    flex: isMobile ? 'none' : 1,
    backgroundColor: colors.sidebarBg,
    display: isMobile ? 'none' : 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
    position: 'relative',
    overflow: 'hidden',
  };

  const rightPanelStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isMobile ? '24px 20px' : '40px',
    overflowY: 'auto',
    minHeight: isMobile ? '100vh' : 'auto',
  };

  const formContainerStyle = {
    width: '100%',
    maxWidth: '420px',
  };

  const logoStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '32px',
  };

  const logoIconStyle = {
    width: '48px',
    height: '48px',
    backgroundColor: colors.brandPrimary,
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '22px',
  };

  const titleStyle = {
    fontSize: '28px',
    fontWeight: '700',
    color: colors.textPrimary,
    margin: '0 0 8px 0',
  };

  const subtitleStyle = {
    fontSize: '16px',
    color: colors.textSecondary,
    margin: '0 0 24px 0',
  };

  const inputGroupStyle = {
    marginBottom: '16px',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: '500',
    color: colors.textPrimary,
  };

  const inputWrapperStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  };

  const inputStyle = (hasError) => ({
    width: '100%',
    padding: '12px 16px 12px 44px',
    fontSize: '15px',
    border: `1px solid ${hasError ? colors.error : colors.borderLight}`,
    borderRadius: '10px',
    outline: 'none',
    transition: 'all 0.2s ease',
    backgroundColor: colors.contentSurface,
  });

  const inputIconStyle = {
    position: 'absolute',
    left: '14px',
    color: colors.textMuted,
  };

  const passwordToggleStyle = {
    position: 'absolute',
    right: '14px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: colors.textMuted,
    padding: '4px',
  };

  const buttonStyle = {
    width: '100%',
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: colors.brandPrimary,
    border: 'none',
    borderRadius: '10px',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    transition: 'all 0.2s ease',
    marginTop: '8px',
  };

  const errorStyle = {
    backgroundColor: `${colors.error}15`,
    color: colors.error,
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
  };

  const fieldErrorStyle = {
    fontSize: '12px',
    color: colors.error,
    marginTop: '4px',
  };

  const linkStyle = {
    color: colors.brandPrimary,
    textDecoration: 'none',
    fontWeight: '500',
  };

  return (
    <div style={containerStyle}>
      {/* Left Panel - Branding */}
      <div style={leftPanelStyle}>
        <div style={{ textAlign: 'center', zIndex: 1 }}>
          <img
            src={logoWhite}
            alt="SCOL CRM"
            style={{ height: '80px', width: 'auto', objectFit: 'contain', margin: '0 auto 40px' }}
          />
          <p style={{ color: colors.textMuted, fontSize: '18px', maxWidth: '400px', lineHeight: 1.6 }}>
            Join thousands of counselors managing student applications efficiently.
          </p>
        </div>
        {/* Background decoration */}
        <div style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          backgroundColor: colors.brandPrimary,
          opacity: 0.1,
          top: '-100px',
          right: '-100px',
        }} />
        <div style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          backgroundColor: colors.brandPrimary,
          opacity: 0.1,
          bottom: '-50px',
          left: '-50px',
        }} />
      </div>

      {/* Right Panel - Register Form */}
      <div style={rightPanelStyle}>
        <div style={formContainerStyle}>
          <div style={logoStyle}>
            <img
              src={logoRed}
              alt="SCOL CRM"
              style={{ height: '64px', width: 'auto', objectFit: 'contain' }}
            />
          </div>

          <h2 style={titleStyle}>Create an account</h2>
          <p style={subtitleStyle}>Start your journey with us</p>

          {error && <div style={errorStyle}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Full Name</label>
              <div style={inputWrapperStyle}>
                <User size={18} style={inputIconStyle} />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  style={inputStyle(errors.fullName)}
                />
              </div>
              {errors.fullName && <div style={fieldErrorStyle}>{errors.fullName}</div>}
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Email Address</label>
              <div style={inputWrapperStyle}>
                <Mail size={18} style={inputIconStyle} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  style={inputStyle(errors.email)}
                />
              </div>
              {errors.email && <div style={fieldErrorStyle}>{errors.email}</div>}
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Phone Number</label>
              <div style={inputWrapperStyle}>
                <Phone size={18} style={inputIconStyle} />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  style={inputStyle(errors.phone)}
                />
              </div>
              {errors.phone && <div style={fieldErrorStyle}>{errors.phone}</div>}
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Password</label>
              <div style={inputWrapperStyle}>
                <Lock size={18} style={inputIconStyle} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  style={inputStyle(errors.password)}
                />
                <button
                  type="button"
                  style={passwordToggleStyle}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <div style={fieldErrorStyle}>{errors.password}</div>}
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Confirm Password</label>
              <div style={inputWrapperStyle}>
                <Lock size={18} style={inputIconStyle} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  style={inputStyle(errors.confirmPassword)}
                />
                <button
                  type="button"
                  style={passwordToggleStyle}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && <div style={fieldErrorStyle}>{errors.confirmPassword}</div>}
            </div>

            <button type="submit" style={buttonStyle} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', color: colors.textSecondary }}>
            Already have an account?{' '}
            <Link to="/login" style={linkStyle}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
