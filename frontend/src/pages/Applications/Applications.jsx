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
import { Card, Table, Badge, SearchInput, Button, Select, Modal, Input } from '../../components';
import { applicationService } from '../../services';
import { colors } from '../../theme';

const Applications = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilters, setDateFilters] = useState({ dateFrom: '', dateTo: '' });
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [noteContent, setNoteContent] = useState('');
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
  }, [searchQuery, statusFilter, dateFilters, applications]);

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

    if (dateFilters.dateFrom) {
      filtered = filtered.filter((app) => new Date(app.appliedDate) >= new Date(dateFilters.dateFrom));
    }

    if (dateFilters.dateTo) {
      const toDate = new Date(dateFilters.dateTo);
      toDate.setDate(toDate.getDate() + 1);
      filtered = filtered.filter((app) => new Date(app.appliedDate) < toDate);
    }

    setFilteredApplications(filtered);
  };

  const handleSaveNote = () => {
    if (!noteContent.trim()) return;
    console.log('Saving note for app', selectedApplicationId, noteContent);
    // Here you would typically call applicationService.addNote or similar
    setShowAddNoteModal(false);
    setNoteContent('');
    setSelectedApplicationId(null);
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
      title: <input type="checkbox" style={{ cursor: 'pointer' }} />,
      dataIndex: 'id',
      render: () => <input type="checkbox" style={{ cursor: 'pointer' }} onClick={(e) => e.stopPropagation()} />,
      width: '40px',
    },
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
      title: 'Consultant Name',
      dataIndex: 'lead',
      render: (lead) => lead?.consultantName || '-',
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button
            variant="ghost"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedApplicationId(id);
              setShowAddNoteModal(true);
            }}
          >
            Add Note
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              // Update status functionality can be built similarly
              console.log('Update Status for', id);
            }}
          >
            Update Status
          </Button>
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
        </div>
      ),
    },
  ];

  const statusOptions = [
    { value: 'Pending Review', label: 'Pending Review' },
    { value: 'Application Submitted', label: 'Application Submitted' },
    { value: 'Conditional offer', label: 'Conditional offer' },
    { value: 'Unconditional offer', label: 'Unconditional offer' },
    { value: 'Interview', label: 'Interview' },
    { value: 'Payment', label: 'Payment' },
    { value: 'CAS/COE/120', label: 'CAS/COE/120' },
    { value: 'VISA', label: 'VISA' },
    { value: 'Enrolled', label: 'Enrolled' },
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
              <div style={{ fontSize: isMobile ? '11px' : '13px', color: colors.textSecondary }}>Application Submitted</div>
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
              <div style={{ fontSize: isMobile ? '11px' : '13px', color: colors.textSecondary }}>Pending Documents</div>
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
          alignItems: isMobile ? 'stretch' : 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ width: isMobile ? '100%' : '350px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: colors.textSecondary, visibility: 'hidden' }}>Search</span>
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isMobile ? "Search..." : "Search by name, university, or course..."}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ width: isMobile ? '100%' : '200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: colors.textSecondary }}>Status</span>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[{ value: '', label: 'All Statuses' }, ...statusOptions]}
              placeholder="Filter by status"
              containerStyle={{ marginBottom: 0 }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.textSecondary }}>
              <span style={{ fontSize: '13px', fontWeight: '500' }}>Date Range:</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
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

      {/* Add Note Modal */}
      <Modal
        isOpen={showAddNoteModal}
        onClose={() => {
          setShowAddNoteModal(false);
          setNoteContent('');
        }}
        title="Add Application Note"
        size="small"
        footer={
          <>
            <Button variant="ghost" onClick={() => {
              setShowAddNoteModal(false);
              setNoteContent('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveNote}>Save Note</Button>
          </>
        }
      >
        <div style={{ padding: '16px 0' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: colors.textPrimary, fontWeight: '500' }}>
            Note Content
          </label>
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Write your note here..."
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${colors.borderLight}`,
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default Applications;
