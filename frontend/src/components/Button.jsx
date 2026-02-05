import React from 'react';
import { colors } from '../theme';

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  onClick,
  disabled = false,
  type = 'button',
  icon: Icon,
  className = '',
  ...props
}) => {
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '500',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    opacity: disabled ? 0.6 : 1,
  };

  const variants = {
    primary: {
      backgroundColor: colors.brandPrimary,
      color: '#FFFFFF',
    },
    secondary: {
      backgroundColor: 'transparent',
      color: colors.brandPrimary,
      border: `1px solid ${colors.brandPrimary}`,
    },
    danger: {
      backgroundColor: colors.brandSecondary,
      color: '#FFFFFF',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: colors.textPrimary,
    },
  };

  const sizes = {
    small: {
      padding: '6px 12px',
      fontSize: '13px',
    },
    medium: {
      padding: '10px 20px',
      fontSize: '14px',
    },
    large: {
      padding: '14px 28px',
      fontSize: '16px',
    },
  };

  const style = {
    ...baseStyles,
    ...variants[variant],
    ...sizes[size],
  };

  return (
    <button
      type={type}
      style={style}
      onClick={onClick}
      disabled={disabled}
      className={className}
      {...props}
    >
      {Icon && <Icon size={size === 'small' ? 14 : size === 'large' ? 20 : 16} />}
      {children}
    </button>
  );
};

export default Button;
