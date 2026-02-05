import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { authService } from '../../services/authService';
import { colors } from '../../theme';
import logoRed from '../../assets/Logo/logo_red.png';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { identifier, sessionId } = location.state || {};

  const [step, setStep] = useState(1); // 1: OTP, 2: New Password
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const inputRefs = useRef([]);
  const phone = identifier; // For simplicity, treating identifier as phone

  useEffect(() => {
    if (!identifier) {
      navigate('/forgot-password');
      return;
    }
    inputRefs.current[0]?.focus();
  }, [identifier, navigate]);

  const handleOtpChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split('').forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });
    setOtp(newOtp);
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();

    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    // Move to password step
    setStep(2);
    setError('');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const otpValue = otp.join('');
      await authService.resetPassword(phone, otpValue, formData.password);
      setSuccess(true);

      setTimeout(() => {
        navigate('/login', { state: { message: 'Password reset successfully. You can now login.' } });
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
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
    padding: '20px',
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: colors.contentSurface,
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    padding: '40px',
    textAlign: 'center',
  };

  const logoStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: '24px',
    fontWeight: '700',
    color: colors.textPrimary,
    margin: '0 0 8px 0',
  };

  const subtitleStyle = {
    fontSize: '15px',
    color: colors.textSecondary,
    margin: '0 0 32px 0',
    lineHeight: 1.5,
  };

  const otpContainerStyle = {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '24px',
  };

  const otpInputStyle = {
    width: '50px',
    height: '56px',
    textAlign: 'center',
    fontSize: '24px',
    fontWeight: '600',
    border: `2px solid ${colors.borderLight}`,
    borderRadius: '12px',
    outline: 'none',
    transition: 'all 0.2s ease',
    backgroundColor: colors.contentSurface,
  };

  const inputGroupStyle = {
    marginBottom: '16px',
    textAlign: 'left',
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
  };

  const errorStyle = {
    backgroundColor: `${colors.error}15`,
    color: colors.error,
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '20px',
  };

  const successStyle = {
    backgroundColor: `${colors.success}15`,
    color: colors.success,
    padding: '20px',
    borderRadius: '12px',
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

  const stepIndicatorStyle = {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '32px',
  };

  const stepDotStyle = (isActive, isCompleted) => ({
    width: '32px',
    height: '4px',
    borderRadius: '2px',
    backgroundColor: isActive || isCompleted ? colors.brandPrimary : colors.borderLight,
    transition: 'all 0.3s ease',
  });

  if (success) {
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
          <div style={successStyle}>
            <CheckCircle size={48} style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px 0', color: colors.success }}>Password Reset!</h3>
            <p style={{ margin: 0 }}>Your password has been reset successfully. Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Step Indicator */}
        <div style={stepIndicatorStyle}>
          <div style={stepDotStyle(step === 1, step > 1)} />
          <div style={stepDotStyle(step === 2, false)} />
        </div>

        <h2 style={titleStyle}>
          {step === 1 ? 'Enter Reset Code' : 'Create New Password'}
        </h2>
        <p style={subtitleStyle}>
          {step === 1
            ? 'Enter the 6-digit code sent to your phone/email'
            : 'Choose a strong password for your account'}
        </p>

        {error && <div style={errorStyle}>{error}</div>}

        {step === 1 ? (
          <form onSubmit={handleVerifyOtp}>
            <div style={otpContainerStyle}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={handleOtpPaste}
                  style={{
                    ...otpInputStyle,
                    borderColor: digit ? colors.brandPrimary : colors.borderLight,
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.brandPrimary;
                    e.target.style.boxShadow = `0 0 0 3px ${colors.brandPrimary}20`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = digit ? colors.brandPrimary : colors.borderLight;
                    e.target.style.boxShadow = 'none';
                  }}
                />
              ))}
            </div>

            <button type="submit" style={buttonStyle}>
              Verify Code
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>New Password</label>
              <div style={inputWrapperStyle}>
                <Lock size={20} style={inputIconStyle} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handlePasswordChange}
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
                  onChange={handlePasswordChange}
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
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        <p style={{ marginTop: '24px' }}>
          <Link to="/login" style={linkStyle}>
            <ArrowLeft size={18} />
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
