import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { authService } from '../../services/authService';
import { colors } from '../../theme';
import logoRed from '../../assets/Logo/logo_red.png';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    phone: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await authService.forgotPassword({
        phone: formData.phone,
        newPassword: formData.newPassword,
      });
      navigate('/verify-otp', {
        state: {
          phone: formData.phone,
          otpAccessToken: result.otpAccessToken,
          purpose: 'password_reset',
        }
      });
    } catch (err) {
      setError(err.message || 'Failed to process request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.appBg,
    padding: isMobile ? '16px' : '20px',
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: colors.contentSurface,
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    padding: isMobile ? '24px' : '40px',
  };

  const logoStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: isMobile ? '24px' : '32px',
  };

  const titleStyle = {
    fontSize: isMobile ? '22px' : '24px',
    fontWeight: '700',
    color: colors.textPrimary,
    margin: '0 0 8px 0',
    textAlign: 'center',
  };

  const subtitleStyle = {
    fontSize: isMobile ? '14px' : '15px',
    color: colors.textSecondary,
    margin: '0 0 32px 0',
    textAlign: 'center',
    lineHeight: 1.5,
  };

  const inputGroupStyle = {
    marginBottom: '20px',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: colors.textPrimary,
  };

  const inputWrapperStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 48px 14px 48px',
    fontSize: '15px',
    border: `1px solid ${colors.borderLight}`,
    borderRadius: '10px',
    outline: 'none',
    transition: 'all 0.2s ease',
    backgroundColor: colors.contentSurface,
  };

  const inputIconStyle = {
    position: 'absolute',
    left: '16px',
    color: colors.textMuted,
  };

  const passwordToggleStyle = {
    position: 'absolute',
    right: '16px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: colors.textMuted,
    padding: '4px',
    fontFamily: 'inherit',
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
    fontFamily: 'inherit',
  };

  const errorStyle = {
    backgroundColor: `${colors.error}15`,
    color: colors.error,
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '20px',
  };

  const linkStyle = {
    color: colors.brandPrimary,
    textDecoration: 'none',
    fontWeight: '500',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={logoStyle}>
          <img
            src={logoRed}
            alt="SCOL CRM"
            style={{ height: '64px', width: 'auto', objectFit: 'contain' }}
          />
        </div>

        <h2 style={titleStyle}>Forgot Password?</h2>
        <p style={subtitleStyle}>
          Enter your phone number and a new password. We'll text you a code to confirm the change.
        </p>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Phone Number</label>
            <div style={inputWrapperStyle}>
              <Phone size={20} style={inputIconStyle} />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
                style={{ ...inputStyle, paddingRight: '16px' }}
                required
              />
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>New Password</label>
            <div style={inputWrapperStyle}>
              <Lock size={20} style={inputIconStyle} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Enter new password"
                style={inputStyle}
                required
              />
              <button
                type="button"
                style={passwordToggleStyle}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Confirm Password</label>
            <div style={inputWrapperStyle}>
              <Lock size={20} style={inputIconStyle} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm new password"
                style={inputStyle}
                required
              />
              <button
                type="button"
                style={passwordToggleStyle}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button type="submit" style={buttonStyle} disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Code'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px' }}>
          <Link to="/login" style={linkStyle}>
            <ArrowLeft size={18} />
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
