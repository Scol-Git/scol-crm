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
import {
  APPLICATION_STATUS,
  applicationStatusVariant,
  APPLICATION_STAGE,
  applicationStageVariant,
} from '../../services/mappers';
import { colors } from '../../theme';

const Applications = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [dateFilters, setDateFilters] = useState({ dateFrom: '', dateTo: '' });
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [noteContent, setNoteContent] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [savingAction, setSavingAction] = useState(false);
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
  }, [searchQuery, statusFilter, stageFilter, dateFilters, applications]);

  const loadApplications = async () => {
    try {
      const { applications: data } = await applicationService.getAll();
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

    if (stageFilter) {
      filtered = filtered.filter((app) => app.stage === stageFilter);
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

  const handleSaveNote = async () => {
    if (!noteContent.trim() || !selectedApplication) return;
    setSavingAction(true);
    try {
      await applicationService.addNote(selectedApplication.leadId, selectedApplication.id, {
        description: noteContent.trim(),
      });
      setShowAddNoteModal(false);
      setNoteContent('');
      setSelectedApplication(null);
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setSavingAction(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!newStatus || !selectedApplication) return;
    setSavingAction(true);
    try {
      await applicationService.changeStatus(selectedApplication.leadId, selectedApplication.id, {
        toStatus: newStatus,
        remarks: statusRemarks.trim() || undefined,
      });
      setShowStatusModal(false);
      setNewStatus('');
      setStatusRemarks('');
      setSelectedApplication(null);
      loadApplications();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setSavingAction(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING':
        return <FileText size={16} />;
      case 'IN_PROGRESS':
        return <Clock size={16} />;
      case 'ON_HOLD':
        return <AlertCircle size={16} />;
      case 'COMPLETED':
        return <CheckCircle size={16} />;
      case 'REJECTED':
      case 'CANCELLED':
        return <XCircle size={16} />;
      default:
        return <FileText size={16} />;
    }
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
          <Badge variant={applicationStatusVariant(status)}>
            {APPLICATION_STATUS.label(status)}
          </Badge>
        </div>
      ),
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      render: (stage) => stage ? (
        <Badge variant={applicationStageVariant(stage)}>{APPLICATION_STAGE.label(stage)}</Badge>
      ) : '-',
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
              setSelectedApplication(row);
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
              setSelectedApplication(row);
              setNewStatus(row.status || '');
              setShowStatusModal(true);
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
              navigate(`/applications/${id}`, { state: { leadId: row.leadId } });
            }}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  const statusOptions = APPLICATION_STATUS.options;
  const stageOptions = APPLICATION_STAGE.options;

  // Calculate stats
  const stats = {
    total: applications.length,
    pending: applications.filter(a => ['PENDING', 'IN_PROGRESS'].includes(a.status)).length,
    completed: applications.filter(a => a.status === 'COMPLETED').length,
    onHold: applications.filter(a => a.status === 'ON_HOLD').length,
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
              <div style={{ fontSize: isMobile ? '11px' : '13px', color: colors.textSecondary }}>Pending / In Progress</div>
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
              <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', color: colors.textPrimary }}>{stats.completed}</div>
              <div style={{ fontSize: isMobile ? '11px' : '13px', color: colors.textSecondary }}>Completed</div>
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
              <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', color: colors.textPrimary }}>{stats.onHold}</div>
              <div style={{ fontSize: isMobile ? '11px' : '13px', color: colors.textSecondary }}>On Hold</div>
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
          <div style={{ width: isMobile ? '100%' : '200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: colors.textSecondary }}>Stage</span>
            <Select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              options={[{ value: '', label: 'All Stages' }, ...stageOptions]}
              placeholder="Filter by stage"
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
            onRowClick={(app) => navigate(`/applications/${app.id}`, { state: { leadId: app.leadId } })}
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
          setSelectedApplication(null);
        }}
        title="Add Application Note"
        size="small"
        footer={
          <>
            <Button variant="ghost" onClick={() => {
              setShowAddNoteModal(false);
              setNoteContent('');
              setSelectedApplication(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveNote} disabled={savingAction}>
              {savingAction ? 'Saving...' : 'Save Note'}
            </Button>
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

      {/* Update Status Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setNewStatus('');
          setStatusRemarks('');
          setSelectedApplication(null);
        }}
        title="Update Application Status"
        size="small"
        footer={
          <>
            <Button variant="ghost" onClick={() => {
              setShowStatusModal(false);
              setNewStatus('');
              setStatusRemarks('');
              setSelectedApplication(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveStatus} disabled={savingAction || !newStatus}>
              {savingAction ? 'Saving...' : 'Update Status'}
            </Button>
          </>
        }
      >
        <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Select
            label="New Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={statusOptions}
            containerStyle={{ marginBottom: 0 }}
          />
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: colors.textPrimary, fontWeight: '500' }}>
              Remarks (optional)
            </label>
            <textarea
              value={statusRemarks}
              onChange={(e) => setStatusRemarks(e.target.value)}
              placeholder="Why is the status changing?"
              style={{
                width: '100%',
                minHeight: '90px',
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${colors.borderLight}`,
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Applications;
