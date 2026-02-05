import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { authService } from '../../services/authService';
import { colors } from '../../theme';
import logoRed from '../../assets/Logo/logo_red.png';

const VerifyOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { phone, sessionId, purpose = 'verify' } = location.state || {};

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    // Redirect if no phone number
    if (!phone) {
      navigate('/login');
      return;
    }

    // Focus first input
    inputRefs.current[0]?.focus();

    // Start resend timer
    const timer = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phone, navigate]);

  const handleChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Move to previous input on backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split('').forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });
    setOtp(newOtp);

    // Focus appropriate input
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.verifyOtp(phone, otpValue);
      setSuccess(true);

      // Navigate based on purpose
      setTimeout(() => {
        if (purpose === 'register') {
          navigate('/login', { state: { message: 'Phone verified successfully. You can now login.' } });
        } else {
          navigate('/dashboard');
        }
      }, 1500);
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    try {
      await authService.sendOtp(phone, purpose);
      setCanResend(false);
      setResendTimer(30);
      setError('');

      // Restart timer
      const timer = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to resend OTP');
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

  const resendStyle = {
    color: canResend ? colors.brandPrimary : colors.textMuted,
    cursor: canResend ? 'pointer' : 'default',
    fontWeight: '500',
    background: 'none',
    border: 'none',
    fontSize: '14px',
  };

  const maskedPhone = phone?.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2') || '';

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

        {success ? (
          <div style={successStyle}>
            <CheckCircle size={48} style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px 0', color: colors.success }}>Verified!</h3>
            <p style={{ margin: 0 }}>Your phone number has been verified successfully.</p>
          </div>
        ) : (
          <>
            <h2 style={titleStyle}>Verify Your Phone</h2>
            <p style={subtitleStyle}>
              We've sent a 6-digit code to<br />
              <strong>{maskedPhone}</strong>
            </p>

            {error && <div style={errorStyle}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div style={otpContainerStyle}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
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

              <button type="submit" style={buttonStyle} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>

            <p style={{ marginTop: '24px', color: colors.textSecondary }}>
              Didn't receive the code?{' '}
              <button
                type="button"
                style={resendStyle}
                onClick={handleResend}
                disabled={!canResend}
              >
                {canResend ? 'Resend Code' : `Resend in ${resendTimer}s`}
              </button>
            </p>
          </>
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

export default VerifyOtp;
