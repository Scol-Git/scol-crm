import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';
import logoWhite from '../../assets/Logo/logo_white.png';
import logoRed from '../../assets/Logo/logo_red.png';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(formData.identifier, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    backgroundColor: colors.appBg,
  };

  const leftPanelStyle = {
    flex: 1,
    backgroundColor: colors.sidebarBg,
    display: 'flex',
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
    padding: '40px',
  };

  const formContainerStyle = {
    width: '100%',
    maxWidth: '420px',
  };

  const logoStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '48px',
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
    margin: '0 0 32px 0',
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
    marginTop: '8px',
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
  };

  const tabStyle = (isActive) => ({
    flex: 1,
    padding: '12px',
    border: 'none',
    backgroundColor: isActive ? colors.brandPrimary : 'transparent',
    color: isActive ? '#FFFFFF' : colors.textSecondary,
    fontWeight: '500',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
  });

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
            Student Counseling & Overseas Learning - Your complete solution for managing student leads and university applications.
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

      {/* Right Panel - Login Form */}
      <div style={rightPanelStyle}>
        <div style={formContainerStyle}>
          <div style={logoStyle}>
            <img
              src={logoRed}
              alt="SCOL CRM"
              style={{ height: '64px', width: 'auto', objectFit: 'contain' }}
            />
          </div>

          <h2 style={titleStyle}>Welcome back</h2>
          <p style={subtitleStyle}>Enter your credentials to access your account</p>

          {error && <div style={errorStyle}>{error}</div>}

          {/* Login Method Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', backgroundColor: colors.appBg, padding: '4px', borderRadius: '10px' }}>
            <button
              type="button"
              style={tabStyle(loginMethod === 'email')}
              onClick={() => setLoginMethod('email')}
            >
              Email
            </button>
            <button
              type="button"
              style={tabStyle(loginMethod === 'phone')}
              onClick={() => setLoginMethod('phone')}
            >
              Phone
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>
                {loginMethod === 'email' ? 'Email Address' : 'Phone Number'}
              </label>
              <div style={inputWrapperStyle}>
                {loginMethod === 'email' ? (
                  <Mail size={20} style={inputIconStyle} />
                ) : (
                  <Phone size={20} style={inputIconStyle} />
                )}
                <input
                  type={loginMethod === 'email' ? 'email' : 'tel'}
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleChange}
                  placeholder={loginMethod === 'email' ? 'Enter your email' : 'Enter your phone number'}
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div style={inputGroupStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={labelStyle}>Password</label>
                <Link to="/forgot-password" style={{ ...linkStyle, fontSize: '14px' }}>
                  Forgot password?
                </Link>
              </div>
              <div style={inputWrapperStyle}>
                <Lock size={20} style={inputIconStyle} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
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

            <button type="submit" style={buttonStyle} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', color: colors.textSecondary }}>
            Don't have an account?{' '}
            <Link to="/register" style={linkStyle}>Sign up</Link>
          </p>

          {/* Demo Credentials */}
          <div style={{
            marginTop: '32px',
            padding: '16px',
            backgroundColor: colors.appBg,
            borderRadius: '10px',
            fontSize: '13px',
          }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: colors.textPrimary }}>Demo Credentials:</p>
            <p style={{ margin: '0 0 4px 0', color: colors.textSecondary }}>
              Email: <code style={{ backgroundColor: colors.contentSurface, padding: '2px 6px', borderRadius: '4px' }}>admin@scolcrm.com</code>
            </p>
            <p style={{ margin: 0, color: colors.textSecondary }}>
              Password: <code style={{ backgroundColor: colors.contentSurface, padding: '2px 6px', borderRadius: '4px' }}>admin123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
