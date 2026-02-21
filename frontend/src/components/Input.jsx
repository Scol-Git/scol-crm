import React from 'react';
import { colors } from '../theme';

const Input = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  name,
  id,
  style,
  containerStyle: customContainerStyle,
  ...props
}) => {
  const containerStyle = {
    marginBottom: customContainerStyle?.marginBottom !== undefined ? customContainerStyle.marginBottom : '16px',
    ...customContainerStyle,
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: '500',
    color: colors.textPrimary,
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    border: `1px solid ${error ? colors.error : colors.borderLight}`,
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    backgroundColor: disabled ? colors.appBg : colors.contentSurface,
    color: colors.textPrimary,
    boxSizing: 'border-box',
    ...style,
  };

  const errorStyle = {
    marginTop: '4px',
    fontSize: '12px',
    color: colors.error,
  };

  const handleFocus = (e) => {
    e.target.style.borderColor = colors.brandPrimary;
    e.target.style.boxShadow = `0 0 0 3px ${colors.brandPrimary}20`;
  };

  const handleBlur = (e) => {
    e.target.style.borderColor = error ? colors.error : colors.borderLight;
    e.target.style.boxShadow = 'none';
  };

  return (
    <div style={containerStyle}>
      {label && (
        <label htmlFor={id || name} style={labelStyle}>
          {label}
          {required && <span style={{ color: colors.error }}> *</span>}
        </label>
      )}
      <input
        type={type}
        id={id || name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        style={inputStyle}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
      {error && <div style={errorStyle}>{error}</div>}
    </div>
  );
};

export default Input;
