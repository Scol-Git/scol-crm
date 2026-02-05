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

  useEffect(() => {
    loadApplications();
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <Card padding="20px">
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
              <FileText size={20} />
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: colors.textPrimary }}>{stats.total}</div>
              <div style={{ fontSize: '13px', color: colors.textSecondary }}>Total Applications</div>
            </div>
          </div>
        </Card>
        <Card padding="20px">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: `${colors.warning}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.warning,
            }}>
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: colors.textPrimary }}>{stats.pending}</div>
              <div style={{ fontSize: '13px', color: colors.textSecondary }}>Pending Review</div>
            </div>
          </div>
        </Card>
        <Card padding="20px">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: `${colors.success}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.success,
            }}>
              <CheckCircle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: colors.textPrimary }}>{stats.accepted}</div>
              <div style={{ fontSize: '13px', color: colors.textSecondary }}>Offers Received</div>
            </div>
          </div>
        </Card>
        <Card padding="20px">
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
              <GraduationCap size={20} />
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: colors.textPrimary }}>{stats.enrolled}</div>
              <div style={{ fontSize: '13px', color: colors.textSecondary }}>Enrolled</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, university, or course..."
            style={{ width: '350px' }}
          />
          <div style={{ width: '200px' }}>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
              placeholder="Filter by status"
            />
          </div>
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '14px' }}>
          {filteredApplications.length} application(s)
        </div>
      </div>

      {/* Applications Table */}
      <Card padding="0">
        <Table
          columns={columns}
          data={filteredApplications}
          loading={loading}
          onRowClick={(app) => navigate(`/applications/${app.id}`)}
          emptyMessage="No applications found"
        />
      </Card>
    </div>
  );
};

export default Applications;
