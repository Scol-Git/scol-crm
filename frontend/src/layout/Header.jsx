import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, ChevronDown, LogOut, Menu, Trash2, Users, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

const Header = ({ title, onMenuClick, isMobile }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchValue, setSearchValue] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  // Sample notifications data
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'lead',
      title: 'New Lead Added',
      message: 'John Smith has been added as a new lead',
      time: '5 minutes ago',
      read: false,
      icon: Users,
    },
    {
      id: 2,
      type: 'application',
      title: 'Application Status Updated',
      message: 'Sarah Johnson\'s application has been accepted',
      time: '1 hour ago',
      read: false,
      icon: CheckCircle,
    },
    {
      id: 3,
      type: 'task',
      title: 'Task Due Today',
      message: 'Follow up with Michael Brown regarding documents',
      time: '2 hours ago',
      read: false,
      icon: AlertCircle,
    },
    {
      id: 4,
      type: 'application',
      title: 'New Application Submitted',
      message: 'Emily Davis submitted application to Oxford University',
      time: '3 hours ago',
      read: true,
      icon: FileText,
    },
    {
      id: 5,
      type: 'system',
      title: 'System Update',
      message: 'New features have been added to the CRM',
      time: '1 day ago',
      read: true,
      icon: Bell,
    },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const headerStyle = {
    height: '70px',
    backgroundColor: colors.headerBg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isMobile ? '0 16px' : '0 32px',
    position: 'sticky',
    top: 0,
    zIndex: 50,
    gap: '16px',
  };

  const leftStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '12px' : '24px',
    flex: isMobile ? 1 : 'none',
  };

  const menuButtonStyle = {
    display: isMobile ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    border: 'none',
    background: 'transparent',
    color: colors.textLight,
    cursor: 'pointer',
    borderRadius: '8px',
  };

  const titleStyle = {
    color: colors.textLight,
    fontSize: isMobile ? '16px' : '20px',
    fontWeight: '600',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const searchContainerStyle = {
    position: 'relative',
    display: isMobile ? (showSearch ? 'flex' : 'none') : 'flex',
    alignItems: 'center',
    flex: isMobile && showSearch ? 1 : 'none',
  };

  const searchInputStyle = {
    width: isMobile ? '100%' : '300px',
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
    gap: isMobile ? '8px' : '12px',
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
    flexShrink: 0,
  };

  const userInfoStyle = {
    display: isMobile ? 'none' : 'flex',
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
        {/* Mobile menu button */}
        <button
          style={menuButtonStyle}
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <Menu size={24} />
        </button>
        <h1 style={titleStyle}>{title}</h1>
      </div>

      {/* Search - hidden on mobile by default, shown when toggled */}
      {(!isMobile || showSearch) && (
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
      )}

      <div style={rightStyle}>
        {/* Mobile search toggle */}
        {isMobile && !showSearch && (
          <button
            style={iconButtonStyle}
            onClick={() => setShowSearch(true)}
            aria-label="Search"
          >
            <Search size={20} />
          </button>
        )}
        {isMobile && showSearch && (
          <button
            style={iconButtonStyle}
            onClick={() => setShowSearch(false)}
            aria-label="Close search"
          >
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>✕</span>
          </button>
        )}

        {/* Notification Bell with Dropdown */}
        <div ref={notificationRef} style={{ position: 'relative' }}>
          <button
            style={iconButtonStyle}
            onClick={() => setShowNotifications(!showNotifications)}
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
            {unreadCount > 0 && (
              <span style={{
                ...notificationBadgeStyle,
                width: unreadCount > 9 ? '18px' : '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: '600',
                color: '#fff',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: isMobile ? '-80px' : 0,
              marginTop: '8px',
              backgroundColor: colors.contentSurface,
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
              border: `1px solid ${colors.borderLight}`,
              width: isMobile ? '320px' : '380px',
              maxHeight: '480px',
              overflow: 'hidden',
              zIndex: 1000,
            }}>
              {/* Header */}
              <div style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${colors.borderLight}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: colors.textPrimary, fontWeight: '600' }}>
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span style={{ fontSize: '12px', color: colors.textSecondary }}>
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: colors.brandPrimary,
                        fontSize: '12px',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.appBg}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              {/* Notification List */}
              <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                {notifications.length > 0 ? (
                  notifications.map((notification) => {
                    const IconComponent = notification.icon;
                    return (
                      <div
                        key={notification.id}
                        style={{
                          padding: '14px 20px',
                          borderBottom: `1px solid ${colors.borderLight}`,
                          backgroundColor: notification.read ? 'transparent' : `${colors.brandPrimary}08`,
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                          display: 'flex',
                          gap: '12px',
                        }}
                        onClick={() => markAsRead(notification.id)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = notification.read
                            ? colors.appBg
                            : `${colors.brandPrimary}12`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = notification.read
                            ? 'transparent'
                            : `${colors.brandPrimary}08`;
                        }}
                      >
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: notification.type === 'lead' ? `${colors.info}15` :
                            notification.type === 'application' ? `${colors.success}15` :
                            notification.type === 'task' ? `${colors.warning}15` : `${colors.textSecondary}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: notification.type === 'lead' ? colors.info :
                            notification.type === 'application' ? colors.success :
                            notification.type === 'task' ? colors.warning : colors.textSecondary,
                          flexShrink: 0,
                        }}>
                          <IconComponent size={18} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                          }}>
                            <span style={{
                              fontSize: '14px',
                              fontWeight: notification.read ? '400' : '600',
                              color: colors.textPrimary,
                            }}>
                              {notification.title}
                            </span>
                            {!notification.read && (
                              <span style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: colors.brandPrimary,
                                flexShrink: 0,
                              }} />
                            )}
                          </div>
                          <p style={{
                            margin: '4px 0 0 0',
                            fontSize: '13px',
                            color: colors.textSecondary,
                            lineHeight: 1.4,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {notification.message}
                          </p>
                          <span style={{
                            fontSize: '11px',
                            color: colors.textMuted,
                            marginTop: '4px',
                            display: 'block',
                          }}>
                            {notification.time}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: colors.textMuted,
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            opacity: 0.5,
                            transition: 'opacity 0.15s ease',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = 0.5}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: colors.textSecondary,
                  }}>
                    <Bell size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
                    <p style={{ margin: 0 }}>No notifications</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div style={{
                  padding: '12px 20px',
                  borderTop: `1px solid ${colors.borderLight}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <button
                    onClick={clearAllNotifications}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: colors.textSecondary,
                      fontSize: '13px',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.appBg;
                      e.currentTarget.style.color = colors.textPrimary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = colors.textSecondary;
                    }}
                  >
                    Clear all
                  </button>
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/settings');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: colors.brandPrimary,
                      fontSize: '13px',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontWeight: '500',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.appBg}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    View all settings
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          ref={userMenuRef}
          style={userMenuStyle}
          onClick={() => setShowUserMenu(!showUserMenu)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.sidebarBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <div style={avatarStyle}>{user?.fullName?.charAt(0) || 'A'}</div>
          <div style={userInfoStyle}>
            <span style={userNameStyle}>{user?.fullName || 'Admin User'}</span>
            <span style={userRoleStyle}>{user?.userType === 'admin' ? 'Administrator' : 'User'}</span>
          </div>
          <ChevronDown size={16} color={colors.textMuted} />

          <div style={dropdownStyle}>
            <div
              style={dropdownItemStyle}
              onClick={() => navigate('/settings')}
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
              onClick={() => navigate('/settings')}
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
              style={{ ...dropdownItemStyle, color: colors.brandSecondary, borderTop: `1px solid ${colors.borderLight}`, display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={handleLogout}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.appBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <LogOut size={16} />
              Logout
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
