import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Phone, ArrowLeft } from 'lucide-react';
import { authService } from '../../services/authService';
import { colors } from '../../theme';
import logoRed from '../../assets/Logo/logo_red.png';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [method, setMethod] = useState('email'); // 'email' or 'phone'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await authService.forgotPassword(identifier);
      setSuccess(true);
      if (result.phone) {
        setMaskedPhone(result.phone);
      }
      // After showing success, navigate to reset password
      setTimeout(() => {
        navigate('/reset-password', {
          state: {
            identifier,
            sessionId: result.sessionId,
          }
        });
      }, 2000);
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
    padding: '14px 16px 14px 48px',
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

  const successStyle = {
    backgroundColor: `${colors.success}15`,
    color: colors.success,
    padding: '16px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '20px',
    textAlign: 'center',
  };

  const linkStyle = {
    color: colors.brandPrimary,
    textDecoration: 'none',
    fontWeight: '500',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  };

  const tabStyle = (isActive) => ({
    flex: 1,
    padding: '12px',
    border: 'none',
    backgroundColor: isActive ? colors.brandPrimary : 'transparent',
    color: isActive ? '#FFFFFF' : colors.textSecondary,
    fontWeight: '500',
    fontSize: '14px',
    fontFamily: 'inherit',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
  });

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
          No worries! Enter your email or phone number and we'll send you a reset code.
        </p>

        {error && <div style={errorStyle}>{error}</div>}

        {success && (
          <div style={successStyle}>
            <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>Reset code sent!</p>
            <p style={{ margin: 0 }}>
              {maskedPhone ? `OTP sent to ${maskedPhone}` : 'Check your email for reset instructions.'}
            </p>
          </div>
        )}

        {!success && (
          <>
            {/* Method Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', backgroundColor: colors.appBg, padding: '4px', borderRadius: '10px' }}>
              <button
                type="button"
                style={tabStyle(method === 'email')}
                onClick={() => setMethod('email')}
              >
                Email
              </button>
              <button
                type="button"
                style={tabStyle(method === 'phone')}
                onClick={() => setMethod('phone')}
              >
                Phone
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>
                  {method === 'email' ? 'Email Address' : 'Phone Number'}
                </label>
                <div style={inputWrapperStyle}>
                  {method === 'email' ? (
                    <Mail size={20} style={inputIconStyle} />
                  ) : (
                    <Phone size={20} style={inputIconStyle} />
                  )}
                  <input
                    type={method === 'email' ? 'email' : 'tel'}
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setError('');
                    }}
                    placeholder={method === 'email' ? 'Enter your email' : 'Enter your phone number'}
                    style={inputStyle}
                    required
                  />
                </div>
              </div>

              <button type="submit" style={buttonStyle} disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>
          </>
        )}

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
