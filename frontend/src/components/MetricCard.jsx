import React from 'react';
import { colors } from '../theme';

const MetricCard = ({ title, value, icon: Icon, trend, color = colors.brandPrimary }) => {
  const cardStyle = {
    backgroundColor: colors.contentSurface,
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: `1px solid ${colors.borderLight}`,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minWidth: 0,
  };

  const contentStyle = {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    flex: 1,
  };

  const titleStyle = {
    fontSize: '13px',
    color: colors.textSecondary,
    marginBottom: '8px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const valueStyle = {
    fontSize: '28px',
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 1,
  };

  const trendStyle = {
    fontSize: '12px',
    marginTop: '8px',
    color: trend?.positive ? colors.success : colors.error,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  };

  const iconContainerStyle = {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    backgroundColor: `${color}15`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: color,
    flexShrink: 0,
    marginLeft: '12px',
  };

  return (
    <div style={cardStyle}>
      <div style={contentStyle}>
        <span style={titleStyle}>{title}</span>
        <span style={valueStyle}>{value}</span>
        {trend && (
          <span style={trendStyle}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      {Icon && (
        <div style={iconContainerStyle}>
          <Icon size={24} />
        </div>
      )}
    </div>
  );
};

export default MetricCard;
