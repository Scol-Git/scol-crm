import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, MapPin, BookOpen, Calendar, DollarSign, Clock, Edit2 } from 'lucide-react';
import { Card, Button, Badge, Table } from '../../components';
import { universityService } from '../../services';
import { colors } from '../../theme';

const UniversityDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [university, setUniversity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    loadUniversity();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [id]);

  const loadUniversity = async () => {
    try {
      const data = await universityService.getById(id);
      setUniversity(data);
    } catch (error) {
      console.error('Failed to load university:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ color: colors.textSecondary }}>Loading university details...</div>
      </div>
    );
  }

  if (!university) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2 style={{ color: colors.textPrimary }}>University not found</h2>
        <Button onClick={() => navigate('/universities')} style={{ marginTop: '16px' }}>
          Back to Universities
        </Button>
      </div>
    );
  }

  const courseColumns = [
    {
      title: 'Course Name',
      dataIndex: 'courseName',
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: '500', color: colors.textPrimary }}>{value}</div>
          <div style={{ fontSize: '12px', color: colors.textSecondary }}>
            {row.programme?.name || ''} • {row.degree?.degreeName || ''}
          </div>
        </div>
      ),
    },
    {
      title: 'Min. GPA',
      dataIndex: 'minGpa',
      render: (value) => value ? value.toFixed(1) : '-',
    },
    {
      title: 'Intakes',
      dataIndex: 'intakes',
      render: (value) => (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {value && value.length > 0 ? (
            value.map((intake, index) => (
              <Badge key={index} variant="info" size="small">
                {intake.intakeYear}
              </Badge>
            ))
          ) : (
            <span style={{ color: colors.textSecondary }}>-</span>
          )}
        </div>
      ),
    },
    {
      title: 'Tuition Fee',
      dataIndex: 'intakes',
      render: (value) => {
        const activeIntake = value?.find(i => i.isActive);
        if (activeIntake && activeIntake.tuitionFee) {
          return `${activeIntake.currency} ${activeIntake.tuitionFee.toLocaleString()}`;
        }
        return '-';
      },
    },
    {
      title: 'Duration',
      dataIndex: 'intakes',
      render: (value) => {
        const activeIntake = value?.find(i => i.isActive);
        if (activeIntake && activeIntake.courseDuration) {
          return `${activeIntake.courseDuration} months`;
        }
        return '-';
      },
    },
  ];

  return (
    <div>
      {/* Back Button */}
      <button
        onClick={() => navigate('/universities')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'transparent',
          border: 'none',
          color: colors.textSecondary,
          cursor: 'pointer',
          marginBottom: '24px',
          fontSize: '14px',
        }}
      >
        <ArrowLeft size={18} />
        Back to Universities
      </button>

      {/* University Header */}
      <Card style={{ marginBottom: '24px' }} padding="0">
        {/* Cover Image */}
        {university.coverImageUrl && (
          <div
            style={{
              height: '200px',
              backgroundImage: `url(${university.coverImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}

        <div style={{ padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px' }}>
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '16px',
                backgroundColor: colors.appBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                border: `1px solid ${colors.borderLight}`,
                marginTop: university.coverImageUrl ? '-60px' : 0,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
            >
              {university.logoUrl ? (
                <img
                  src={university.logoUrl}
                  alt={university.uniName}
                  style={{ width: '80px', height: '80px', objectFit: 'contain' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <span style={{ fontWeight: '700', fontSize: '32px', color: colors.brandPrimary }}>
                  {university.uniName?.charAt(0) || 'U'}
                </span>
              )}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '28px', color: colors.textPrimary, fontWeight: '600' }}>
                {university.uniName}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textSecondary }}>
                  <MapPin size={16} />
                  <span>
                    {university.city?.cityName ? `${university.city.cityName}, ` : ''}
                    {university.state?.stateName ? `${university.state.stateName}, ` : ''}
                    {university.country?.countryName || ''}
                  </span>
                </div>
                {university.website && (
                  <a
                    href={university.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: colors.brandPrimary,
                      textDecoration: 'none',
                    }}
                  >
                    <Globe size={16} />
                    <span>Website</span>
                  </a>
                )}
              </div>
              {university.commission && (
                <Badge variant="success" size="medium" style={{ marginTop: '12px' }}>
                  {university.commission}% Commission
                </Badge>
              )}
            </div>
          </div>
          <Button icon={Edit2} variant="secondary">
            Edit University
          </Button>
        </div>
      </Card>

      {/* Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* About */}
        <Card title="About University">
          <p style={{ color: colors.textPrimary, lineHeight: 1.7, margin: 0 }}>
            {university.aboutUs || 'No description available.'}
          </p>
        </Card>

        {/* Quick Info */}
        <Card title="Quick Info">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: `${colors.brandPrimary}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.brandPrimary,
              }}>
                <BookOpen size={20} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: colors.textSecondary }}>Total Courses</div>
                <div style={{ fontWeight: '600', color: colors.textPrimary }}>
                  {university.courses?.length || 0}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: `${colors.info}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.info,
              }}>
                <Calendar size={20} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: colors.textSecondary }}>Active Intakes</div>
                <div style={{ fontWeight: '600', color: colors.textPrimary }}>
                  {university.intakes?.length || 0}
                </div>
              </div>
            </div>

            {university.address && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: `${colors.success}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.success,
                  flexShrink: 0,
                }}>
                  <MapPin size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: colors.textSecondary }}>Address</div>
                  <div style={{ fontWeight: '500', color: colors.textPrimary, fontSize: '14px' }}>
                    {university.address}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Courses */}
      <Card
        title="Available Courses"
        subtitle={`${university.courses?.length || 0} courses available`}
        padding="0"
      >
        <Table
          columns={courseColumns}
          data={university.courses || []}
          emptyMessage="No courses available"
        />
      </Card>
    </div>
  );
};

export default UniversityDetails;
