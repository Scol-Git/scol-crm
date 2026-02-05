import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { colors } from '../theme';

const MainLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/') return 'Dashboard';
    if (path.startsWith('/leads')) return 'Leads';
    if (path.startsWith('/applications')) return 'Applications';
    if (path.startsWith('/universities')) return 'Universities';
    if (path.startsWith('/courses')) return 'Courses';
    if (path.startsWith('/tasks')) return 'Tasks';
    if (path.startsWith('/reports')) return 'Reports';
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
    marginLeft: isMobile ? 0 : '260px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    transition: 'margin-left 0.3s ease',
    width: isMobile ? '100%' : 'calc(100% - 260px)',
  };

  const contentStyle = {
    flex: 1,
    padding: isMobile ? '16px' : '24px 32px',
    overflowY: 'auto',
  };

  return (
    <div style={layoutStyle}>
      {/* Overlay for mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar isOpen={sidebarOpen} isMobile={isMobile} onClose={() => setSidebarOpen(false)} />
      <div style={mainContainerStyle}>
        <Header title={getPageTitle()} onMenuClick={toggleSidebar} isMobile={isMobile} />
        <main style={contentStyle}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
