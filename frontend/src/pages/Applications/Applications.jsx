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
import { Card, Table, Badge, SearchInput, Button, Select, Modal, Input, Alert } from '../../components';
import { applicationService } from '../../services';
import { buildApplicationQuery } from '../../services/applicationService';
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
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageInfo, setPageInfo] = useState({ cursor: null, hasNext: false });
  const [error, setError] = useState('');
  const [statistics, setStatistics] = useState(null);
  const [actionError, setActionError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [consultantFilter, setConsultantFilter] = useState('');
  const [consultants, setConsultants] = useState([]);
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
    loadDropdownData();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadDropdownData = async () => {
    try {
      const { consultants: list } = await applicationService.getDropdownData();
      setConsultants(list);
    } catch (err) {
      // Non-fatal: the consultant filter just stays empty.
      console.error('Failed to load application dropdown data:', err);
    }
  };

  // Search + filters are applied server-side (debounced); any change resets
  // back to the first page.
  useEffect(() => {
    const timer = setTimeout(() => loadApplications(), 350);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, stageFilter, consultantFilter, dateFilters.dateFrom, dateFilters.dateTo]);

  const currentQuery = () => buildApplicationQuery({
    searchText: searchQuery,
    status: statusFilter,
    stage: stageFilter,
    consultantId: consultantFilter,
    dateFrom: dateFilters.dateFrom,
    dateTo: dateFilters.dateTo,
  });

  const loadApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const { applications: data, pagination, statistics: stats } = await applicationService.getAll(currentQuery());
      setApplications(data);
      setStatistics(stats);
      setPageInfo({ cursor: pagination?.cursor ?? null, hasNext: !!pagination?.hasNext });
    } catch (err) {
      console.error('Failed to load applications:', err);
      setError(err.message || 'Failed to load applications.');
      setApplications([]);
      setPageInfo({ cursor: null, hasNext: false });
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!pageInfo.hasNext || !pageInfo.cursor) return;
    setLoadingMore(true);
    setError('');
    try {
      const { applications: data, pagination } = await applicationService.getAll({ ...currentQuery(), cursor: pageInfo.cursor });
      setApplications((prev) => [...prev, ...data]);
      setPageInfo({ cursor: pagination?.cursor ?? null, hasNext: !!pagination?.hasNext });
    } catch (err) {
      console.error('Failed to load more applications:', err);
      setError(err.message || 'Failed to load more applications.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteContent.trim() || !selectedApplication) return;
    if (!selectedApplication.leadId) {
      setActionError('This application has no linked lead id, so the note cannot be saved.');
      return;
    }
    setSavingAction(true);
    setActionError('');
    try {
      await applicationService.addNote(selectedApplication.leadId, selectedApplication.id, {
        description: noteContent.trim(),
      });
      setShowAddNoteModal(false);
      setNoteContent('');
      setSelectedApplication(null);
    } catch (err) {
      console.error('Failed to save note:', err);
      setActionError(err.message || 'Failed to save note. Please try again.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!newStatus || !selectedApplication) return;
    if (!selectedApplication.leadId) {
      setActionError('This application has no linked lead id, so the status cannot be changed.');
      return;
    }
    setSavingAction(true);
    setActionError('');
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
    } catch (err) {
      console.error('Failed to update status:', err);
      setActionError(err.message || 'Failed to update status. Please try again.');
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

  // The backend rejects these status changes without remarks (verified live),
  // so require one here instead of surfacing a 400.
  const statusNeedsRemarks = ['ON_HOLD', 'COMPLETED', 'REJECTED', 'CANCELLED'].includes(newStatus);
  const stageOptions = APPLICATION_STAGE.options;

  // The list endpoint returns headline counts for the whole result set; the
  // client-side tallies below only ever saw the current page, so prefer the
  // server's numbers and fall back only if they're absent.
  const stats = {
    total: statistics?.totalApplications ?? applications.length,
    pending: statistics?.pendingReview ?? applications.filter((a) => ['PENDING', 'IN_PROGRESS'].includes(a.status)).length,
    submitted: statistics?.applicationSubmitted ?? applications.filter((a) => a.stage === 'SUBMITTED').length,
    pendingDocuments: statistics?.pendingDocuments ?? null,
    completed: applications.filter((a) => a.status === 'COMPLETED').length,
    onHold: applications.filter((a) => a.status === 'ON_HOLD').length,
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
              <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', color: colors.textPrimary }}>{stats.submitted}</div>
              <div style={{ fontSize: isMobile ? '11px' : '13px', color: colors.textSecondary }}>Submitted</div>
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
              <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', color: colors.textPrimary }}>{stats.pendingDocuments ?? stats.onHold}</div>
              <div style={{ fontSize: isMobile ? '11px' : '13px', color: colors.textSecondary }}>{stats.pendingDocuments != null ? 'Pending Documents' : 'On Hold'}</div>
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
          {consultants.length > 0 && (
            <div style={{ width: isMobile ? '100%' : '200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: colors.textSecondary }}>Consultant</span>
              <Select
                value={consultantFilter}
                onChange={(e) => setConsultantFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Consultants' },
                  ...consultants.map((c) => ({ value: c.id, label: c.name })),
                ]}
                placeholder="Filter by consultant"
                containerStyle={{ marginBottom: 0 }}
              />
            </div>
          )}
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
          {applications.length} application(s){pageInfo.hasNext ? ' so far' : ''}
        </div>
      </div>

      {/* Load / filter errors */}
      <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert>

      {/* Applications Table */}
      <Card padding="0">
        <div style={{ overflowX: 'auto' }}>
          <Table
            columns={columns}
            data={applications}
            loading={loading}
            onRowClick={(app) => navigate(`/applications/${app.id}`, { state: { leadId: app.leadId } })}
            emptyMessage="No applications found"
          />
        </div>
      </Card>

      {/* Cursor pagination - the list endpoint caps each page at 50 rows */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: '16px',
      }}>
        {pageInfo.hasNext && (
          <Button variant="ghost" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load more'}
          </Button>
        )}
      </div>

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
          <Alert variant="error" onDismiss={() => setActionError('')}>{actionError}</Alert>
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
            <Button
              onClick={handleSaveStatus}
              disabled={savingAction || !newStatus || (statusNeedsRemarks && !statusRemarks.trim())}
            >
              {savingAction ? 'Saving...' : 'Update Status'}
            </Button>
          </>
        }
      >
        <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Alert variant="error" onDismiss={() => setActionError('')}>{actionError}</Alert>
          <Select
            label="New Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={statusOptions}
            containerStyle={{ marginBottom: 0 }}
          />
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: colors.textPrimary, fontWeight: '500' }}>
              {statusNeedsRemarks ? 'Remarks (required)' : 'Remarks (optional)'}
            </label>
            {statusNeedsRemarks && (
              <p style={{ margin: '-4px 0 8px', fontSize: '12px', color: colors.textSecondary }}>
                Moving to {APPLICATION_STATUS.label(newStatus)} requires a reason.
              </p>
            )}
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
