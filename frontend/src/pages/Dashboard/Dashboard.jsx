import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  BookOpen,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { Card, MetricCard, Badge, Table } from '../../components';
import { dashboardService } from '../../services';
import { colors } from '../../theme';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await dashboardService.getStats();
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  };

  const chartsGrid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  };

  const recentLeadsColumns = [
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
      {/* Metrics Section */}
      <div style={metricsGrid}>
        <MetricCard
          title="Total Students"
          value={stats?.totalLeads || 0}
          icon={Users}
          color={colors.brandPrimary}
          trend={{ positive: true, value: '+12% this month' }}
        />
        <MetricCard
          title="Total Universities"
          value={stats?.totalUniversities || 0}
          icon={GraduationCap}
          color={colors.info}
        />
        <MetricCard
          title="Total Courses"
          value={stats?.totalCourses || 0}
          icon={BookOpen}
          color={colors.success}
        />
        <MetricCard
          title="Active Journeys"
          value={stats?.activeJourneys || 0}
          icon={TrendingUp}
          color={colors.warning}
          trend={{ positive: true, value: '+5 this week' }}
        />
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
                new: colors.info,
                contacted: colors.warning,
                qualified: colors.success,
                enrolled: '#10B981',
                lost: colors.error,
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
                  Conversion Rate
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: colors.textPrimary }}>
                  {stats?.totalLeads > 0
                    ? Math.round((statusData.enrolled / stats.totalLeads) * 100)
                    : 0}%
                </div>
              </div>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                border: `4px solid ${colors.success}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '600',
                color: colors.success,
              }}>
                {statusData.enrolled || 0}
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
                  Pending Follow-ups
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: colors.textPrimary }}>
                  {statusData.contacted || 0}
                </div>
              </div>
              <Badge variant="warning" size="large">Action Needed</Badge>
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
                  New Leads (This Week)
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: colors.textPrimary }}>
                  {statusData.new || 0}
                </div>
              </div>
              <Badge variant="new" size="large">New</Badge>
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
