import React from 'react';
import { colors } from '../theme';

const Card = ({
  children,
  title,
  subtitle,
  padding = '24px',
  className = '',
  style = {},
  headerAction,
  ...props
}) => {
  const cardStyle = {
    backgroundColor: colors.contentSurface,
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: `1px solid ${colors.borderLight}`,
    overflow: 'hidden',
    ...style,
  };

  const headerStyle = {
    padding: '16px 24px',
    borderBottom: `1px solid ${colors.borderLight}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const titleStyle = {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: colors.textPrimary,
  };

  const subtitleStyle = {
    margin: '4px 0 0 0',
    fontSize: '14px',
    color: colors.textSecondary,
  };

  const contentStyle = {
    padding,
  };

  return (
    <div style={cardStyle} className={className} {...props}>
      {(title || headerAction) && (
        <div style={headerStyle}>
          <div>
            {title && <h3 style={titleStyle}>{title}</h3>}
            {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div style={contentStyle}>{children}</div>
    </div>
  );
};

export default Card;
