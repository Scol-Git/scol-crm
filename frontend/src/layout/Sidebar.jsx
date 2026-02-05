import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Settings,
  BookOpen,
  FileText,
  CheckSquare,
  BarChart3,
} from 'lucide-react';
import { colors } from '../theme';
import logoWhite from '../assets/Logo/logo_white.png';

const Sidebar = () => {
  const location = useLocation();

  const sidebarStyle = {
    width: '260px',
    minWidth: '260px',
    backgroundColor: colors.sidebarBg,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 100,
  };

  const logoContainerStyle = {
    padding: '24px',
    borderBottom: `1px solid ${colors.borderColor}`,
  };

  const logoStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textDecoration: 'none',
  };

  const logoImageStyle = {
    height: '60px',
    width: 'auto',
    objectFit: 'contain',
  };

  const navStyle = {
    padding: '16px 12px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/leads', label: 'Leads', icon: Users },
    { path: '/applications', label: 'Applications', icon: FileText },
    { path: '/universities', label: 'Universities', icon: GraduationCap },
    { path: '/courses', label: 'Courses', icon: BookOpen },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const getLinkStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    textDecoration: 'none',
    color: isActive ? colors.textLight : colors.textMuted,
    backgroundColor: isActive ? colors.brandPrimary : 'transparent',
    transition: 'all 0.2s ease',
    fontSize: '14px',
    fontWeight: isActive ? '600' : '500',
  });

  return (
    <div style={sidebarStyle}>
      <div style={logoContainerStyle}>
        <div style={logoStyle}>
          <img src={logoWhite} alt="SCOL CRM" style={logoImageStyle} />
        </div>
      </div>

      <nav style={navStyle}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={getLinkStyle(isActive)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = colors.headerBg;
                  e.currentTarget.style.color = colors.textLight;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = colors.textMuted;
                }
              }}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div style={{ padding: '16px 24px', borderTop: `1px solid ${colors.borderColor}` }}>
        <div style={{ fontSize: '12px', color: colors.textMuted }}>
          © 2026 SCOL CRM
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
