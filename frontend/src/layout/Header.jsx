import React, { useState } from 'react';
import { Bell, Search, User, ChevronDown } from 'lucide-react';
import { colors } from '../theme';

const Header = ({ title }) => {
  const [searchValue, setSearchValue] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const headerStyle = {
    height: '70px',
    backgroundColor: colors.headerBg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  };

  const leftStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  };

  const titleStyle = {
    color: colors.textLight,
    fontSize: '20px',
    fontWeight: '600',
    margin: 0,
  };

  const searchContainerStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  };

  const searchInputStyle = {
    width: '300px',
    padding: '10px 14px 10px 40px',
    fontSize: '14px',
    border: `1px solid ${colors.borderColor}`,
    borderRadius: '8px',
    backgroundColor: colors.sidebarBg,
    color: colors.textLight,
    outline: 'none',
  };

  const searchIconStyle = {
    position: 'absolute',
    left: '12px',
    color: colors.textMuted,
  };

  const rightStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  };

  const iconButtonStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: colors.textMuted,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    position: 'relative',
  };

  const notificationBadgeStyle = {
    position: 'absolute',
    top: '6px',
    right: '6px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: colors.brandPrimary,
  };

  const userMenuStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
  };

  const avatarStyle = {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: colors.brandPrimary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: '14px',
  };

  const userInfoStyle = {
    display: 'flex',
    flexDirection: 'column',
  };

  const userNameStyle = {
    color: colors.textLight,
    fontSize: '14px',
    fontWeight: '500',
  };

  const userRoleStyle = {
    color: colors.textMuted,
    fontSize: '12px',
  };

  const dropdownStyle = {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    backgroundColor: colors.contentSurface,
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    border: `1px solid ${colors.borderLight}`,
    minWidth: '180px',
    zIndex: 100,
    display: showUserMenu ? 'block' : 'none',
  };

  const dropdownItemStyle = {
    padding: '10px 16px',
    fontSize: '14px',
    color: colors.textPrimary,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  };

  return (
    <header style={headerStyle}>
      <div style={leftStyle}>
        <h1 style={titleStyle}>{title}</h1>
      </div>

      <div style={searchContainerStyle}>
        <Search size={18} style={searchIconStyle} />
        <input
          type="text"
          placeholder="Global search..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          style={searchInputStyle}
        />
      </div>

      <div style={rightStyle}>
        <button
          style={iconButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.sidebarBg;
            e.currentTarget.style.color = colors.textLight;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = colors.textMuted;
          }}
        >
          <Bell size={20} />
          <span style={notificationBadgeStyle} />
        </button>

        <div
          style={userMenuStyle}
          onClick={() => setShowUserMenu(!showUserMenu)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.sidebarBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <div style={avatarStyle}>A</div>
          <div style={userInfoStyle}>
            <span style={userNameStyle}>Admin User</span>
            <span style={userRoleStyle}>Administrator</span>
          </div>
          <ChevronDown size={16} color={colors.textMuted} />

          <div style={dropdownStyle}>
            <div
              style={dropdownItemStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.appBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Profile
            </div>
            <div
              style={dropdownItemStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.appBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Settings
            </div>
            <div
              style={{ ...dropdownItemStyle, color: colors.brandSecondary, borderTop: `1px solid ${colors.borderLight}` }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.appBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Logout
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
