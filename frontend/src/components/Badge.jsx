import React from 'react';
import { colors } from '../theme';

const Badge = ({ children, variant = 'default', size = 'medium' }) => {
  const variants = {
    default: {
      backgroundColor: colors.borderLight,
      color: colors.textPrimary,
    },
    new: {
      backgroundColor: colors.statusNew,
      color: '#1E40AF',
    },
    contacted: {
      backgroundColor: colors.statusContacted,
      color: '#92400E',
    },
    qualified: {
      backgroundColor: colors.statusQualified,
      color: '#065F46',
    },
    enrolled: {
      backgroundColor: colors.statusEnrolled,
      color: '#FFFFFF',
    },
    lost: {
      backgroundColor: colors.statusLost,
      color: '#991B1B',
    },
    success: {
      backgroundColor: colors.statusQualified,
      color: '#065F46',
    },
    warning: {
      backgroundColor: colors.statusContacted,
      color: '#92400E',
    },
    error: {
      backgroundColor: colors.statusLost,
      color: '#991B1B',
    },
    info: {
      backgroundColor: colors.statusNew,
      color: '#1E40AF',
    },
  };

  const sizes = {
    small: {
      padding: '2px 8px',
      fontSize: '11px',
    },
    medium: {
      padding: '4px 12px',
      fontSize: '12px',
    },
    large: {
      padding: '6px 16px',
      fontSize: '14px',
    },
  };

  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '9999px',
    fontWeight: '500',
    textTransform: 'capitalize',
    ...variants[variant] || variants.default,
    ...sizes[size],
  };

  return <span style={style}>{children}</span>;
};

export default Badge;
