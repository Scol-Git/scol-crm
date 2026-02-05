import React from 'react';
import { Search } from 'lucide-react';
import { colors } from '../theme';

const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search...',
  onSearch,
  className = '',
}) => {
  const containerStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px 10px 40px',
    fontSize: '14px',
    border: `1px solid ${colors.borderLight}`,
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    backgroundColor: colors.contentSurface,
    color: colors.textPrimary,
    boxSizing: 'border-box',
  };

  const iconStyle = {
    position: 'absolute',
    left: '12px',
    color: colors.textSecondary,
    pointerEvents: 'none',
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(value);
    }
  };

  return (
    <div style={containerStyle} className={className}>
      <Search size={18} style={iconStyle} />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={inputStyle}
        onKeyDown={handleKeyDown}
        onFocus={(e) => {
          e.target.style.borderColor = colors.brandPrimary;
          e.target.style.boxShadow = `0 0 0 3px ${colors.brandPrimary}20`;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = colors.borderLight;
          e.target.style.boxShadow = 'none';
        }}
      />
    </div>
  );
};

export default SearchInput;
