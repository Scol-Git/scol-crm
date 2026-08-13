import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { colors } from '../theme';

// Inline banner for surfacing API errors / confirmations. Previously every
// failed request was swallowed by a console.error, so a failed save looked
// like a dead button.
const VARIANTS = {
  error: { color: colors.error, Icon: AlertCircle },
  success: { color: colors.success, Icon: CheckCircle },
  warning: { color: colors.warning, Icon: AlertCircle },
  info: { color: colors.info, Icon: Info },
};

const Alert = ({ children, variant = 'error', onDismiss, style = {} }) => {
  if (!children) return null;

  const { color, Icon } = VARIANTS[variant] || VARIANTS.error;

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 14px',
        marginBottom: '16px',
        borderRadius: '8px',
        border: `1px solid ${color}40`,
        backgroundColor: `${color}12`,
        color: colors.textPrimary,
        fontSize: '14px',
        lineHeight: 1.45,
        ...style,
      }}
    >
      <Icon size={18} style={{ color, flexShrink: 0, marginTop: '1px' }} />
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: colors.textSecondary,
            padding: '2px',
            lineHeight: 0,
            flexShrink: 0,
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default Alert;
