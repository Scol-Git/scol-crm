import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { colors } from '../theme';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  footer,
}) => {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const sizes = {
    small: '400px',
    medium: '560px',
    large: '720px',
    xlarge: '900px',
  };

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: isMobile ? 'flex-end' : 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: isMobile ? '0' : '20px',
  };

  const modalStyle = {
    backgroundColor: colors.contentSurface,
    borderRadius: isMobile ? '16px 16px 0 0' : '12px',
    width: '100%',
    maxWidth: isMobile ? '100%' : sizes[size],
    maxHeight: isMobile ? '90vh' : '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  };

  const headerStyle = {
    padding: isMobile ? '16px 20px' : '20px 24px',
    borderBottom: `1px solid ${colors.borderLight}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const titleStyle = {
    margin: 0,
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: '600',
    color: colors.textPrimary,
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.textSecondary,
    transition: 'background-color 0.15s ease',
  };

  const contentStyle = {
    padding: isMobile ? '20px' : '24px',
    overflowY: 'auto',
    flex: 1,
  };

  const footerStyle = {
    padding: isMobile ? '16px 20px' : '16px 24px',
    borderTop: `1px solid ${colors.borderLight}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: isMobile ? 'stretch' : 'flex-end',
    gap: '12px',
    flexDirection: isMobile ? 'column-reverse' : 'row',
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div style={overlayStyle} onClick={handleOverlayClick}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>{title}</h2>
          <button
            style={closeButtonStyle}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = colors.appBg;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            <X size={20} />
          </button>
        </div>
        <div style={contentStyle}>{children}</div>
        {footer && <div style={footerStyle}>{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
