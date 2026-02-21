import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  BookOpen,
  TrendingUp,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { Card, MetricCard, Badge, Table, Input } from '../../components';
import { dashboardService } from '../../services';
import { colors } from '../../theme';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFilters, setDateFilters] = useState({ dateFrom: '', dateTo: '' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    loadStats();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadStats();
  }, [dateFilters]);

  const loadStats = async () => {
    try {
      setLoading(true);
      // Pass the dateFilters down to the service if supported.
      const data = await dashboardService.getStats(dateFilters);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ color: colors.textSecondary }}>Loading dashboard...</div>
      </div>
    );
  }

  const metricsGrid = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: isMobile ? '16px' : '24px',
    marginBottom: isMobile ? '24px' : '32px',
  };

  const chartsGrid = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: isMobile ? '16px' : '24px',
    marginBottom: isMobile ? '24px' : '32px',
  };

  const recentLeadsColumns = isMobile ? [
    {
      title: 'Name',
      dataIndex: 'fullName',
      render: (value, row) => (
        <div>
          <span style={{ fontWeight: '500', color: colors.textPrimary, display: 'block' }}>{value}</span>
          <span style={{ fontSize: '12px', color: colors.textSecondary }}>{row.email || '-'}</span>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (value) => <Badge variant={value}>{value}</Badge>,
    },
  ] : [
    {
      title: 'Name',
      dataIndex: 'fullName',
      render: (value) => (
        <span style={{ fontWeight: '500', color: colors.textPrimary }}>{value}</span>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      render: (value) => value || '-',
    },
    {
      title: 'Target University',
      dataIndex: 'targetUniversity',
      render: (value) => value || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (value) => <Badge variant={value}>{value}</Badge>,
    },
  ];

  const statusData = stats?.leadsByStatus || {};
  const totalStatusLeads = Object.values(statusData).reduce((a, b) => a + b, 0);

  return (
    <div>
      {/* Date Filters Header */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'flex-end',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: '12px',
        marginBottom: '24px',
        backgroundColor: colors.appBg,
        padding: '16px',
        borderRadius: '12px',
        border: `1px solid ${colors.borderLight}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.textSecondary }}>
          <Filter size={18} />
          <span style={{ fontSize: '14px', fontWeight: '500' }}>Filter Date Range:</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flex: isMobile ? 1 : 'none' }}>
          <Input
            type="date"
            placeholder="From Date"
            value={dateFilters.dateFrom}
            onChange={(e) => setDateFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            containerStyle={{ flex: 1, marginBottom: 0 }}
          />
          <Input
            type="date"
            placeholder="To Date"
            value={dateFilters.dateTo}
            onChange={(e) => setDateFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            containerStyle={{ flex: 1, marginBottom: 0 }}
          />
        </div>
      </div>

      {/* Metrics Section - Row 1 (Leads) */}
      <div style={{ ...metricsGrid, marginBottom: '24px' }}>
        <MetricCard
          title="Total Lead"
          value={stats?.totalLeads || 0}
          icon={Users}
          color={colors.brandPrimary}
        />
        <MetricCard
          title="Online Lead"
          value={stats?.onlineLeads || 0}
          icon={Users}
          color={colors.info}
        />
        <MetricCard
          title="Offline lead"
          value={stats?.offlineLeads || 0}
          icon={Users}
          color={colors.warning}
        />
        <MetricCard
          title="Logged in Lead"
          value={stats?.loggedInLeads || 0}
          icon={Users}
          color={colors.success}
        />
      </div>

      {/* Metrics Section - Row 2 (Enrollment) */}
      <div style={metricsGrid}>
        <MetricCard
          title="Total Enrollment"
          value={stats?.totalEnrollment || 0}
          icon={GraduationCap}
          color={colors.brandPrimary}
        />
        <MetricCard
          title="Online Enrollment"
          value={stats?.onlineEnrollment || 0}
          icon={GraduationCap}
          color={colors.info}
        />
        <MetricCard
          title="Physical Enrollment"
          value={stats?.physicalEnrollment || 0}
          icon={GraduationCap}
          color={colors.warning}
        />
      </div>

      {/* Application Statuses Bar Chart */}
      <div style={{ marginBottom: isMobile ? '24px' : '32px' }}>
        <Card title="Application Statuses by Intake" padding="24px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflowX: 'auto', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '16px', minWidth: '700px', height: '250px', alignItems: 'flex-end', paddingTop: '20px' }}>
              {(stats?.applicationStatuses || []).map((intake, i) => {
                const maxVal = Math.max(...(stats?.applicationStatuses?.map(s => s.submitted) || [0]), 1);

                const stages = [
                  { key: 'submitted', label: 'Submitted', color: '#3B82F6' },
                  { key: 'conditional', label: 'Conditional', color: '#F59E0B' },
                  { key: 'unconditional', label: 'Unconditional', color: '#10B981' },
                  { key: 'interview', label: 'Interview', color: '#8B5CF6' },
                  { key: 'payment', label: 'Payment', color: '#EC4899' },
                  { key: 'cas', label: 'CAS/COE/120', color: '#06B6D4' },
                  { key: 'visa', label: 'VISA', color: '#14B8A6' },
                ];

                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100%', width: '100%', justifyContent: 'center' }}>
                      {stages.map((stage, j) => {
                        const val = intake[stage.key] || 0;
                        const heightPct = (val / maxVal) * 100;
                        return (
                          <div
                            key={j}
                            title={`${stage.label}: ${val}`}
                            style={{
                              width: '12px',
                              height: `${heightPct}%`,
                              backgroundColor: stage.color,
                              borderRadius: '4px 4px 0 0',
                              transition: 'height 0.3s ease',
                              minHeight: val > 0 ? '4px' : '0'
                            }}
                          />
                        );
                      })}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.textSecondary, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {intake.name}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chart Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', marginTop: '8px' }}>
              {[
                { key: 'submitted', label: 'Submitted', color: '#3B82F6' },
                { key: 'conditional', label: 'Conditional offer', color: '#F59E0B' },
                { key: 'unconditional', label: 'Unconditional offer', color: '#10B981' },
                { key: 'interview', label: 'Interview', color: '#8B5CF6' },
                { key: 'payment', label: 'Payment', color: '#EC4899' },
                { key: 'cas', label: 'CAS/COE/120', color: '#06B6D4' },
                { key: 'visa', label: 'VISA', color: '#14B8A6' },
              ].map(legend => (
                <div key={legend.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: colors.textSecondary }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: legend.color }} />
                  {legend.label}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div style={chartsGrid}>
        {/* Lead Status Distribution */}
        <Card title="Lead Status Distribution" padding="24px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.entries(statusData).map(([status, count]) => {
              const percentage = totalStatusLeads > 0
                ? Math.round((count / totalStatusLeads) * 100)
                : 0;

              const statusColors = {
                'new lead': colors.info,
                eligible: colors.success,
                'not eligible': colors.error,
                unreachable: colors.warning,
                visited: '#8B5CF6',
              };

              return (
                <div key={status}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                    fontSize: '14px',
                  }}>
                    <span style={{
                      textTransform: 'capitalize',
                      color: colors.textPrimary,
                      fontWeight: '500',
                    }}>
                      {status}
                    </span>
                    <span style={{ color: colors.textSecondary }}>
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div style={{
                    height: '8px',
                    backgroundColor: colors.appBg,
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${percentage}%`,
                      backgroundColor: statusColors[status] || colors.brandPrimary,
                      borderRadius: '4px',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Quick Stats */}
        <Card title="Quick Overview" padding="24px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              backgroundColor: colors.appBg,
              borderRadius: '8px',
            }}>
              <div>
                <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '4px' }}>
                  Eligible Lead Rate
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: colors.textPrimary }}>
                  {stats?.eligibleLeadRate || 0}%
                </div>
              </div>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                border: `4px solid ${colors.info}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '600',
                color: colors.info,
              }}>
                Rate
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              backgroundColor: colors.appBg,
              borderRadius: '8px',
            }}>
              <div>
                <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '4px' }}>
                  Application Rate
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: colors.textPrimary }}>
                  {stats?.applicationRate || 0}%
                </div>
              </div>
              <Badge variant="new" size="large">Rate</Badge>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              backgroundColor: colors.appBg,
              borderRadius: '8px',
            }}>
              <div>
                <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '4px' }}>
                  VISA Rate
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: colors.textPrimary }}>
                  {stats?.visaRate || 0}%
                </div>
              </div>
              <Badge variant="success" size="large">Rate</Badge>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              backgroundColor: colors.appBg,
              borderRadius: '8px',
            }}>
              <div>
                <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '4px' }}>
                  Enroll Rate
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: colors.textPrimary }}>
                  {stats?.enrollRate || 0}%
                </div>
              </div>
              <Badge variant="warning" size="large">Rate</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Leads */}
      <Card
        title="Recent Leads"
        headerAction={
          <button
            onClick={() => navigate('/leads')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              color: colors.brandPrimary,
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            View All <ArrowRight size={16} />
          </button>
        }
        padding="0"
      >
        <Table
          columns={recentLeadsColumns}
          data={stats?.recentLeads || []}
          onRowClick={(lead) => navigate(`/leads/${lead.id}`)}
          emptyMessage="No recent leads"
        />
      </Card>
    </div>
  );
};

export default Dashboard;
