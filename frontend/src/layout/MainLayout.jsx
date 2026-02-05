import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { colors } from '../theme';

const MainLayout = () => {
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/') return 'Dashboard';
    if (path.startsWith('/leads')) return 'Lead Management';
    if (path.startsWith('/universities')) return 'Universities';
    if (path.startsWith('/courses')) return 'Courses';
    if (path.startsWith('/settings')) return 'Settings';
    return 'SCOL CRM';
  };

  const layoutStyle = {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: colors.appBg,
  };

  const mainContainerStyle = {
    flex: 1,
    marginLeft: '260px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  };

  const contentStyle = {
    flex: 1,
    padding: '24px 32px',
    overflowY: 'auto',
  };

  return (
    <div style={layoutStyle}>
      <Sidebar />
      <div style={mainContainerStyle}>
        <Header title={getPageTitle()} />
        <main style={contentStyle}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
