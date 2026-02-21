import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  DollarSign,
  Globe,
  BarChart3,
  Download,
  Calendar,
} from 'lucide-react';
import { Card, Button, Input, MetricCard } from '../../components';
import { reportService } from '../../services';
import { colors } from '../../theme';

const Reports = () => {
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [countryStats, setCountryStats] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFilters, setDateFilters] = useState({ dateFrom: '', dateTo: '' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    loadReports();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dateFilters]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const [monthly, countries, summaryData] = await Promise.all([
        reportService.getMonthlyStats(dateFilters),
        reportService.getCountryStats(dateFilters),
        reportService.getSummary(dateFilters),
      ]);
      setMonthlyStats(monthly);
      setCountryStats(countries);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ color: colors.textSecondary }}>Loading reports...</div>
      </div>
    );
  }

  const maxLeads = Math.max(...monthlyStats.map(m => m.leads));
  const maxRevenue = Math.max(...countryStats.map(c => c.revenue));

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? '16px' : '24px',
        marginBottom: '24px'
      }}>
        <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
          <h2 style={{ margin: 0, color: colors.textPrimary, fontSize: isMobile ? '20px' : '24px' }}>Analytics & Reports</h2>
          <p style={{ margin: '4px 0 0 0', color: colors.textSecondary, fontSize: isMobile ? '13px' : '14px' }}>
            Track performance metrics and generate insights
          </p>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '12px',
          alignItems: isMobile ? 'stretch' : 'center'
        }}>
          <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
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
          <Button variant="secondary" icon={Download} style={{ width: isMobile ? '100%' : 'auto' }}>
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: isMobile ? '16px' : '20px',
        marginBottom: isMobile ? '24px' : '32px',
      }}>
        <MetricCard
          title="Total Applications"
          value={summary?.totalApplications || 0}
          icon={BarChart3}
          color={colors.brandPrimary}
        />
        <MetricCard
          title="Acceptance Rate"
          value={`${summary?.acceptanceRate || 0}%`}
          icon={TrendingUp}
          color={colors.success}
          trend={{ positive: true, value: '+5% vs last period' }}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${summary?.conversionRate || 0}%`}
          icon={Users}
          color={colors.info}
        />
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(summary?.totalRevenue || 0)}
          icon={DollarSign}
          color={colors.warning}
          trend={{ positive: true, value: '+12% growth' }}
        />
      </div>

      {/* Charts Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: isMobile ? '16px' : '24px',
        marginBottom: '24px',
      }}>
        {/* Monthly Trends */}
        <Card title="Monthly Trends" subtitle="Lead acquisition and applications over time">
          <div style={{ padding: '16px 0' }}>
            {/* Simple Bar Chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '200px', marginBottom: '16px' }}>
              {monthlyStats.map((month, index) => (
                <div
                  key={index}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '160px' }}>
                    <div
                      style={{
                        width: '20px',
                        height: `${(month.leads / maxLeads) * 160}px`,
                        backgroundColor: colors.brandPrimary,
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s ease',
                      }}
                      title={`Leads: ${month.leads}`}
                    />
                    <div
                      style={{
                        width: '20px',
                        height: `${(month.applications / maxLeads) * 160}px`,
                        backgroundColor: colors.info,
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s ease',
                      }}
                      title={`Applications: ${month.applications}`}
                    />
                  </div>
                  <span style={{ fontSize: '10px', color: colors.textSecondary }}>
                    {month.month.split(' ')[0].substring(0, 3)}
                  </span>
                </div>
              ))}
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: colors.brandPrimary, borderRadius: '2px' }} />
                <span style={{ fontSize: '12px', color: colors.textSecondary }}>Leads</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: colors.info, borderRadius: '2px' }} />
                <span style={{ fontSize: '12px', color: colors.textSecondary }}>Applications</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Conversion Funnel */}
        <Card title="Conversion Funnel" subtitle="Lead to enrollment pipeline">
          <div style={{ padding: '16px 0' }}>
            {[
              { label: 'Total Leads', value: 135, color: colors.brandPrimary },
              { label: 'Applications', value: 72, color: colors.info },
              { label: 'Offers Received', value: 47, color: colors.warning },
              { label: 'Enrolled', value: 18, color: colors.success },
            ].map((stage, index) => {
              const maxWidth = 135;
              const widthPercent = (stage.value / maxWidth) * 100;

              return (
                <div key={index} style={{ marginBottom: '16px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                    fontSize: '14px',
                  }}>
                    <span style={{ color: colors.textPrimary, fontWeight: '500' }}>{stage.label}</span>
                    <span style={{ color: colors.textSecondary }}>{stage.value}</span>
                  </div>
                  <div style={{
                    height: '24px',
                    backgroundColor: colors.appBg,
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${widthPercent}%`,
                      backgroundColor: stage.color,
                      borderRadius: '4px',
                      transition: 'width 0.5s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: '8px',
                    }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#fff',
                      }}>
                        {Math.round(widthPercent)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Country Performance */}
      <Card
        title="Performance by Country"
        subtitle="Application and enrollment statistics by destination"
        headerAction={
          <Button variant="ghost" size="small" icon={Globe}>
            View Details
          </Button>
        }
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: colors.textSecondary,
                  borderBottom: `2px solid ${colors.borderLight}`,
                  fontSize: '13px',
                }}>
                  Country
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: colors.textSecondary,
                  borderBottom: `2px solid ${colors.borderLight}`,
                  fontSize: '13px',
                }}>
                  Applications
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: colors.textSecondary,
                  borderBottom: `2px solid ${colors.borderLight}`,
                  fontSize: '13px',
                }}>
                  Accepted
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: colors.textSecondary,
                  borderBottom: `2px solid ${colors.borderLight}`,
                  fontSize: '13px',
                }}>
                  Enrolled
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'right',
                  fontWeight: '600',
                  color: colors.textSecondary,
                  borderBottom: `2px solid ${colors.borderLight}`,
                  fontSize: '13px',
                }}>
                  Revenue
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: colors.textSecondary,
                  borderBottom: `2px solid ${colors.borderLight}`,
                  fontSize: '13px',
                  width: '200px',
                }}>
                  Performance
                </th>
              </tr>
            </thead>
            <tbody>
              {countryStats.map((country, index) => (
                <tr key={index}>
                  <td style={{
                    padding: '14px 16px',
                    borderBottom: `1px solid ${colors.borderLight}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Globe size={16} color={colors.textSecondary} />
                      <span style={{ fontWeight: '500', color: colors.textPrimary }}>
                        {country.country}
                      </span>
                    </div>
                  </td>
                  <td style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    borderBottom: `1px solid ${colors.borderLight}`,
                    color: colors.textPrimary,
                  }}>
                    {country.applications}
                  </td>
                  <td style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    borderBottom: `1px solid ${colors.borderLight}`,
                    color: colors.textPrimary,
                  }}>
                    {country.accepted}
                  </td>
                  <td style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    borderBottom: `1px solid ${colors.borderLight}`,
                    color: colors.textPrimary,
                  }}>
                    {country.enrolled}
                  </td>
                  <td style={{
                    padding: '14px 16px',
                    textAlign: 'right',
                    borderBottom: `1px solid ${colors.borderLight}`,
                    fontWeight: '600',
                    color: colors.success,
                  }}>
                    {formatCurrency(country.revenue)}
                  </td>
                  <td style={{
                    padding: '14px 16px',
                    borderBottom: `1px solid ${colors.borderLight}`,
                  }}>
                    <div style={{
                      height: '8px',
                      backgroundColor: colors.appBg,
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${(country.revenue / maxRevenue) * 100}%`,
                        backgroundColor: colors.brandPrimary,
                        borderRadius: '4px',
                      }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Monthly Details Table */}
      <Card
        title="Monthly Breakdown"
        subtitle="Detailed monthly statistics"
        style={{ marginTop: '24px' }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: colors.textSecondary,
                  borderBottom: `2px solid ${colors.borderLight}`,
                  fontSize: '13px',
                }}>
                  Month
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: colors.textSecondary,
                  borderBottom: `2px solid ${colors.borderLight}`,
                  fontSize: '13px',
                }}>
                  New Leads
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: colors.textSecondary,
                  borderBottom: `2px solid ${colors.borderLight}`,
                  fontSize: '13px',
                }}>
                  Applications
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: colors.textSecondary,
                  borderBottom: `2px solid ${colors.borderLight}`,
                  fontSize: '13px',
                }}>
                  Accepted
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: colors.textSecondary,
                  borderBottom: `2px solid ${colors.borderLight}`,
                  fontSize: '13px',
                }}>
                  Enrolled
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'right',
                  fontWeight: '600',
                  color: colors.textSecondary,
                  borderBottom: `2px solid ${colors.borderLight}`,
                  fontSize: '13px',
                }}>
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {monthlyStats.map((month, index) => (
                <tr key={index}>
                  <td style={{
                    padding: '14px 16px',
                    borderBottom: `1px solid ${colors.borderLight}`,
                    fontWeight: '500',
                    color: colors.textPrimary,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={14} color={colors.textSecondary} />
                      {month.month}
                    </div>
                  </td>
                  <td style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    borderBottom: `1px solid ${colors.borderLight}`,
                    color: colors.textPrimary,
                  }}>
                    {month.leads}
                  </td>
                  <td style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    borderBottom: `1px solid ${colors.borderLight}`,
                    color: colors.textPrimary,
                  }}>
                    {month.applications}
                  </td>
                  <td style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    borderBottom: `1px solid ${colors.borderLight}`,
                    color: colors.textPrimary,
                  }}>
                    {month.accepted}
                  </td>
                  <td style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    borderBottom: `1px solid ${colors.borderLight}`,
                    color: colors.textPrimary,
                  }}>
                    {month.enrolled}
                  </td>
                  <td style={{
                    padding: '14px 16px',
                    textAlign: 'right',
                    borderBottom: `1px solid ${colors.borderLight}`,
                    fontWeight: '600',
                    color: colors.success,
                  }}>
                    {formatCurrency(month.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: colors.appBg }}>
                <td style={{
                  padding: '14px 16px',
                  fontWeight: '700',
                  color: colors.textPrimary,
                }}>
                  Total
                </td>
                <td style={{
                  padding: '14px 16px',
                  textAlign: 'center',
                  fontWeight: '700',
                  color: colors.textPrimary,
                }}>
                  {monthlyStats.reduce((sum, m) => sum + m.leads, 0)}
                </td>
                <td style={{
                  padding: '14px 16px',
                  textAlign: 'center',
                  fontWeight: '700',
                  color: colors.textPrimary,
                }}>
                  {monthlyStats.reduce((sum, m) => sum + m.applications, 0)}
                </td>
                <td style={{
                  padding: '14px 16px',
                  textAlign: 'center',
                  fontWeight: '700',
                  color: colors.textPrimary,
                }}>
                  {monthlyStats.reduce((sum, m) => sum + m.accepted, 0)}
                </td>
                <td style={{
                  padding: '14px 16px',
                  textAlign: 'center',
                  fontWeight: '700',
                  color: colors.textPrimary,
                }}>
                  {monthlyStats.reduce((sum, m) => sum + m.enrolled, 0)}
                </td>
                <td style={{
                  padding: '14px 16px',
                  textAlign: 'right',
                  fontWeight: '700',
                  color: colors.success,
                }}>
                  {formatCurrency(monthlyStats.reduce((sum, m) => sum + m.revenue, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Reports;
