import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  GraduationCap
} from 'lucide-react';
import { Card, Table, Badge, SearchInput, Button, Select } from '../../components';
import { applicationService } from '../../services';
import { colors } from '../../theme';

const Applications = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    loadApplications();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    filterApplications();
  }, [searchQuery, statusFilter, applications]);

  const loadApplications = async () => {
    try {
      const data = await applicationService.getAll();
      setApplications(data);
      setFilteredApplications(data);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = [...applications];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.lead?.fullName?.toLowerCase().includes(query) ||
          app.university?.uniName?.toLowerCase().includes(query) ||
          app.course?.courseName?.toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    setFilteredApplications(filtered);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'draft':
        return <FileText size={16} />;
      case 'submitted':
      case 'under_review':
        return <Clock size={16} />;
      case 'conditional_offer':
        return <AlertCircle size={16} />;
      case 'accepted':
      case 'enrolled':
        return <CheckCircle size={16} />;
      case 'rejected':
        return <XCircle size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'draft':
        return 'default';
      case 'submitted':
        return 'info';
      case 'under_review':
        return 'warning';
      case 'conditional_offer':
        return 'warning';
      case 'accepted':
        return 'success';
      case 'enrolled':
        return 'enrolled';
      case 'rejected':
        return 'error';
      case 'visa_processing':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatStatus = (status) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const columns = [
    {
      title: 'Applicant',
      dataIndex: 'lead',
      render: (lead) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: colors.brandPrimary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: '600',
              fontSize: '14px',
            }}
          >
            {lead?.fullName?.charAt(0) || '?'}
          </div>
          <div>
            <div style={{ fontWeight: '500', color: colors.textPrimary }}>
              {lead?.fullName || 'Unknown'}
            </div>
            <div style={{ fontSize: '12px', color: colors.textSecondary }}>
              {lead?.email || '-'}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'University & Course',
      dataIndex: 'university',
      render: (university, row) => (
        <div>
          <div style={{ fontWeight: '500', color: colors.textPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <GraduationCap size={14} />
            {university?.uniName || 'Unknown'}
          </div>
          <div style={{ fontSize: '12px', color: colors.textSecondary }}>
            {row.course?.courseName || '-'}
          </div>
        </div>
      ),
    },
    {
      title: 'Applied Date',
      dataIndex: 'appliedDate',
      render: (value) => value ? new Date(value).toLocaleDateString() : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {getStatusIcon(status)}
          <Badge variant={getStatusVariant(status)}>
            {formatStatus(status)}
          </Badge>
        </div>
      ),
    },
    {
      title: 'Last Updated',
      dataIndex: 'lastUpdated',
      render: (value) => value ? new Date(value).toLocaleDateString() : '-',
    },
    {
      title: 'Actions',
      dataIndex: 'id',
      render: (id, row) => (
        <Button
          variant="ghost"
          size="small"
          icon={Eye}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/applications/${id}`);
          }}
        >
          View
        </Button>
      ),
    },
  ];

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'conditional_offer', label: 'Conditional Offer' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'visa_processing', label: 'Visa Processing' },
    { value: 'enrolled', label: 'Enrolled' },
  ];

  // Calculate stats
  const stats = {
    total: applications.length,
    pending: applications.filter(a => ['submitted', 'under_review'].includes(a.status)).length,
    accepted: applications.filter(a => ['accepted', 'conditional_offer'].includes(a.status)).length,
    enrolled: applications.filter(a => a.status === 'enrolled').length,
  };

  return (
    <div>
      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: isMobile ? '12px' : '16px',
        marginBottom: '24px'
      }}>
        <Card padding={isMobile ? '16px' : '20px'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: isMobile ? '36px' : '40px',
              height: isMobile ? '36px' : '40px',
              borderRadius: '8px',
              backgroundColor: `${colors.info}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.info,
              flexShrink: 0,
            }}>
              <FileText size={isMobile ? 18 : 20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', color: colors.textPrimary }}>{stats.total}</div>
              <div style={{ fontSize: isMobile ? '11px' : '13px', color: colors.textSecondary }}>Total Applications</div>
            </div>
          </div>
        </Card>
        <Card padding={isMobile ? '16px' : '20px'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: isMobile ? '36px' : '40px',
              height: isMobile ? '36px' : '40px',
              borderRadius: '8px',
              backgroundColor: `${colors.warning}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.warning,
              flexShrink: 0,
            }}>
              <Clock size={isMobile ? 18 : 20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', color: colors.textPrimary }}>{stats.pending}</div>
              <div style={{ fontSize: isMobile ? '11px' : '13px', color: colors.textSecondary }}>Pending Review</div>
            </div>
          </div>
        </Card>
        <Card padding={isMobile ? '16px' : '20px'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: isMobile ? '36px' : '40px',
              height: isMobile ? '36px' : '40px',
              borderRadius: '8px',
              backgroundColor: `${colors.success}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.success,
              flexShrink: 0,
            }}>
              <CheckCircle size={isMobile ? 18 : 20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', color: colors.textPrimary }}>{stats.accepted}</div>
              <div style={{ fontSize: isMobile ? '11px' : '13px', color: colors.textSecondary }}>Offers Received</div>
            </div>
          </div>
        </Card>
        <Card padding={isMobile ? '16px' : '20px'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: isMobile ? '36px' : '40px',
              height: isMobile ? '36px' : '40px',
              borderRadius: '8px',
              backgroundColor: `${colors.brandPrimary}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.brandPrimary,
              flexShrink: 0,
            }}>
              <GraduationCap size={isMobile ? 18 : 20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', color: colors.textPrimary }}>{stats.enrolled}</div>
              <div style={{ fontSize: isMobile ? '11px' : '13px', color: colors.textSecondary }}>Enrolled</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          marginBottom: '24px',
          gap: isMobile ? '12px' : '16px',
        }}
      >
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '16px',
          alignItems: isMobile ? 'stretch' : 'center'
        }}>
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isMobile ? "Search..." : "Search by name, university, or course..."}
            style={{ width: isMobile ? '100%' : '350px' }}
          />
          <div style={{ width: isMobile ? '100%' : '200px' }}>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
              placeholder="Filter by status"
            />
          </div>
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '14px', textAlign: isMobile ? 'center' : 'right' }}>
          {filteredApplications.length} application(s)
        </div>
      </div>

      {/* Applications Table */}
      <Card padding="0">
        <div style={{ overflowX: 'auto' }}>
          <Table
            columns={columns}
            data={filteredApplications}
            loading={loading}
            onRowClick={(app) => navigate(`/applications/${app.id}`)}
            emptyMessage="No applications found"
          />
        </div>
      </Card>
    </div>
  );
};

export default Applications;
