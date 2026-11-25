import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { Button, Card } from '../../components';
import { colors } from '../../theme';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <Card style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '40px 24px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#fee2e2',
          color: colors.brandPrimary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <FileQuestion size={32} />
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.textPrimary, margin: '0 0 8px' }}>
          404 - Page Not Found
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: '0 0 24px' }}>
          The page you are looking for doesn&apos;t exist, has been removed, or you don&apos;t have permission to access it.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button icon={Home} onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default NotFound;
