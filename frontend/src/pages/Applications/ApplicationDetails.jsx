import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { Card, Button, Badge, Modal, Select } from '../../components';
import { applicationService } from '../../services';
import {
  APPLICATION_STATUS,
  applicationStatusVariant,
  APPLICATION_STAGE,
  applicationStageVariant,
  documentStatusVariant,
} from '../../services/mappers';
import { colors } from '../../theme';

const normalizeActivity = (raw) => ({
  id: raw.id ?? `${raw.date ?? raw.createdAt}-${raw.title ?? raw.action}`,
  title: raw.title ?? raw.action ?? raw.type ?? 'Activity',
  description: raw.description ?? raw.message ?? raw.remarks ?? '',
  date: raw.date ?? raw.createdAt ?? raw.timestamp ?? null,
});

const normalizeDocumentRequirement = (raw) => ({
  id: raw.id ?? raw.documentTypeId,
  label: raw.name ?? raw.label ?? raw.documentTypeName ?? 'Document',
  required: raw.required ?? raw.isRequired ?? true,
  status: raw.status ?? raw.requirementStatus ?? 'PENDING',
});

const normalizeNote = (raw) => ({
  id: raw.id,
  description: raw.description,
  isResolved: !!raw.isResolved,
  createdAt: raw.createdAt ?? null,
});

const ApplicationDetails = () => {
  const { id: applicationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [leadId, setLeadId] = useState(location.state?.leadId ?? null);
  const [application, setApplication] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [showStageModal, setShowStageModal] = useState(false);
  const [newStage, setNewStage] = useState('');
  const [remarks, setRemarks] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [savingAction, setSavingAction] = useState(false);

  useEffect(() => {
    loadApplication();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [applicationId]);

  const loadApplication = async () => {
    setLoading(true);
    try {
      // The API is nested under /crm/leads/{leadId}/applications/{applicationId} -
      // leadId normally arrives via navigation state from the Applications list;
      // on a direct URL visit, fall back to searching the full application list.
      let resolvedLeadId = location.state?.leadId ?? null;
      if (!resolvedLeadId) {
        const { applications } = await applicationService.getAll();
        resolvedLeadId = applications.find((a) => a.id === applicationId)?.leadId ?? null;
      }
      if (!resolvedLeadId) {
        setApplication(null);
        return;
      }
      setLeadId(resolvedLeadId);

      const [appData, documentProgress, activityList, noteList] = await Promise.all([
        applicationService.getById(resolvedLeadId, applicationId),
        applicationService.getDocumentProgress(resolvedLeadId, applicationId).catch(() => []),
        applicationService.getActivities(resolvedLeadId, applicationId).catch(() => []),
        applicationService.getNotes(resolvedLeadId, applicationId).catch(() => []),
      ]);

      setApplication(appData);
      setDocuments((Array.isArray(documentProgress) ? documentProgress : documentProgress?.items ?? []).map(normalizeDocumentRequirement));
      setActivities((Array.isArray(activityList) ? activityList : []).map(normalizeActivity));
      setNotes((Array.isArray(noteList) ? noteList : []).map(normalizeNote));
    } catch (error) {
      console.error('Failed to load application:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus || !leadId) return;
    setSavingAction(true);
    try {
      await applicationService.changeStatus(leadId, applicationId, { toStatus: newStatus, remarks: remarks.trim() || undefined });
      setShowStatusModal(false);
      setNewStatus('');
      setRemarks('');
      loadApplication();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setSavingAction(false);
    }
  };

  const handleUpdateStage = async () => {
    if (!newStage || !leadId) return;
    setSavingAction(true);
    try {
      await applicationService.changeStage(leadId, applicationId, { toStage: newStage, remarks: remarks.trim() || undefined });
      setShowStageModal(false);
      setNewStage('');
      setRemarks('');
      loadApplication();
    } catch (error) {
      console.error('Failed to update stage:', error);
    } finally {
      setSavingAction(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim() || !leadId) return;
    setSavingAction(true);
    try {
      await applicationService.addNote(leadId, applicationId, { description: noteContent.trim() });
      setNoteContent('');
      loadApplication();
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setSavingAction(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ color: colors.textSecondary }}>Loading application details...</div>
      </div>
    );
  }

  if (!application) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2 style={{ color: colors.textPrimary }}>Application not found</h2>
        <Button onClick={() => navigate('/applications')} style={{ marginTop: '16px' }}>
          Back to Applications
        </Button>
      </div>
    );
  }

  const stageSteps = APPLICATION_STAGE.options;
  const currentStepIndex = stageSteps.findIndex((s) => s.value === application.stage);
  const isRejectedOrCancelled = ['REJECTED', 'CANCELLED'].includes(application.status);

  return (
    <div>
      {/* Back Button */}
      <button
        onClick={() => navigate('/applications')}
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
          fontFamily: 'inherit',
          padding: 0,
        }}
      >
        <ArrowLeft size={18} />
        Back to Applications
      </button>

      {/* Header */}
      <Card style={{ marginBottom: '24px' }} padding={isMobile ? '20px' : '32px'}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'flex-start',
          gap: isMobile ? '16px' : '0',
        }}>
          <div>
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: '12px',
              marginBottom: '8px'
            }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? '20px' : '24px', color: colors.textPrimary }}>
                {application.course?.courseName || 'Application'}
              </h1>
              <Badge variant={applicationStatusVariant(application.status)} size="large">
                {APPLICATION_STATUS.label(application.status)}
              </Badge>
              {application.stage && (
                <Badge variant={applicationStageVariant(application.stage)} size="large">
                  {APPLICATION_STAGE.label(application.stage)}
                </Badge>
              )}
            </div>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: isMobile ? '14px' : '16px' }}>
              {application.university?.uniName}
            </p>
            <div style={{
              marginTop: '16px',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '24px'
            }}>
              <div>
                <span style={{ fontSize: '12px', color: colors.textSecondary }}>Applicant</span>
                <div style={{ fontWeight: '500', color: colors.textPrimary }}>
                  {application.lead?.fullName || '-'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: colors.textSecondary }}>Applied Date</span>
                <div style={{ fontWeight: '500', color: colors.textPrimary }}>
                  {application.appliedDate ? new Date(application.appliedDate).toLocaleDateString() : '-'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: colors.textSecondary }}>Last Updated</span>
                <div style={{ fontWeight: '500', color: colors.textPrimary }}>
                  {application.lastUpdated ? new Date(application.lastUpdated).toLocaleDateString() : '-'}
                </div>
              </div>
            </div>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '12px'
          }}>
            <Button
              variant="secondary"
              onClick={() => { setNewStage(application.stage || ''); setShowStageModal(true); }}
              style={{ width: isMobile ? '100%' : 'auto' }}
            >
              Update Stage
            </Button>
            <Button
              onClick={() => { setNewStatus(application.status || ''); setShowStatusModal(true); }}
              style={{ width: isMobile ? '100%' : 'auto' }}
            >
              Update Status
            </Button>
          </div>
        </div>
      </Card>

      {/* Stage Progress */}
      {!isRejectedOrCancelled && currentStepIndex >= 0 && (
        <Card title="Application Progress" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0', overflowX: 'auto' }}>
            {stageSteps.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <React.Fragment key={step.value}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative', minWidth: '64px' }}>
                    <div
                      style={{
                        width: isMobile ? '28px' : '36px',
                        height: isMobile ? '28px' : '36px',
                        borderRadius: '50%',
                        backgroundColor: isCompleted ? colors.success : colors.appBg,
                        border: `2px solid ${isCompleted ? colors.success : colors.borderLight}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isCompleted ? '#fff' : colors.textSecondary,
                        transition: 'all 0.3s ease',
                        zIndex: 2,
                        fontSize: '11px',
                        fontWeight: '600',
                      }}
                    >
                      {index + 1}
                    </div>
                    <span
                      style={{
                        marginTop: '8px',
                        fontSize: isMobile ? '10px' : '11px',
                        fontWeight: isCurrent ? '600' : '400',
                        color: isCompleted ? colors.textPrimary : colors.textSecondary,
                        textAlign: 'center',
                        maxWidth: '80px',
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < stageSteps.length - 1 && (
                    <div
                      style={{
                        flex: 1,
                        minWidth: '16px',
                        height: '2px',
                        backgroundColor: index < currentStepIndex ? colors.success : colors.borderLight,
                        marginBottom: isMobile ? '20px' : '24px',
                        zIndex: 1,
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </Card>
      )}

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: isMobile ? '16px' : '24px' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Documents */}
          <Card title="Documents">
            {documents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      backgroundColor: colors.appBg,
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {doc.status === 'VERIFIED' ? (
                        <CheckCircle size={18} color={colors.success} />
                      ) : (
                        <AlertCircle size={18} color={doc.required ? colors.warning : colors.textMuted} />
                      )}
                      <span style={{ color: colors.textPrimary }}>{doc.label}</span>
                      {doc.required && (
                        <Badge variant="warning" size="small">Required</Badge>
                      )}
                    </div>
                    <Badge variant={documentStatusVariant(doc.status)}>{doc.status?.replace(/_/g, ' ') || 'Pending'}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: colors.textSecondary, textAlign: 'center', padding: '20px' }}>
                No document requirements found for this application.
              </p>
            )}
          </Card>

          {/* Notes */}
          <Card title="Notes & Comments">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {notes.length > 0 ? (
                notes.map((note) => (
                  <div key={note.id} style={{ padding: '16px', backgroundColor: colors.appBg, borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <p style={{ margin: 0, color: colors.textPrimary, lineHeight: 1.6 }}>{note.description}</p>
                      {note.isResolved && <Badge variant="success" size="small">Resolved</Badge>}
                    </div>
                    {note.createdAt && (
                      <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '8px' }}>
                        {new Date(note.createdAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p style={{ margin: 0, color: colors.textSecondary }}>No notes yet.</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Add a note..."
                style={{
                  flex: 1,
                  minHeight: '44px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.borderLight}`,
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
              <Button icon={MessageSquare} onClick={handleAddNote} disabled={savingAction || !noteContent.trim()}>
                Add
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Timeline */}
          <Card title="Recent Activity">
            {activities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {activities.slice(0, 10).map((event, index) => (
                  <div
                    key={event.id}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      paddingBottom: index < activities.length - 1 ? '16px' : 0,
                      borderLeft: index < activities.length - 1 ? `2px solid ${colors.borderLight}` : 'none',
                      marginLeft: '8px',
                      paddingLeft: '20px',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: '-6px',
                        top: '0',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: colors.brandPrimary,
                        border: `2px solid ${colors.contentSurface}`,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', color: colors.textPrimary, fontSize: '14px' }}>
                        {event.title}
                      </div>
                      {event.description && (
                        <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '2px' }}>
                          {event.description}
                        </div>
                      )}
                      {event.date && (
                        <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '4px' }}>
                          {new Date(event.date).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: colors.textSecondary, textAlign: 'center', padding: '20px' }}>
                No activity recorded yet.
              </p>
            )}
          </Card>

          {/* Quick Actions */}
          <Card title="Quick Actions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Button
                variant="secondary"
                style={{ justifyContent: 'flex-start' }}
                onClick={() => navigate(`/leads/${leadId}`)}
              >
                View Lead Profile
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Update Status Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => { setShowStatusModal(false); setRemarks(''); }}
        title="Update Application Status"
        size="small"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowStatusModal(false); setRemarks(''); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus} disabled={savingAction || !newStatus}>
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
            options={APPLICATION_STATUS.options}
            containerStyle={{ marginBottom: 0 }}
          />
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: colors.textPrimary, fontWeight: '500' }}>
              Remarks (optional)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
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

      {/* Update Stage Modal */}
      <Modal
        isOpen={showStageModal}
        onClose={() => { setShowStageModal(false); setRemarks(''); }}
        title="Update Application Stage"
        size="small"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowStageModal(false); setRemarks(''); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStage} disabled={savingAction || !newStage}>
              {savingAction ? 'Saving...' : 'Update Stage'}
            </Button>
          </>
        }
      >
        <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Select
            label="New Stage"
            value={newStage}
            onChange={(e) => setNewStage(e.target.value)}
            options={APPLICATION_STAGE.options}
            containerStyle={{ marginBottom: 0 }}
          />
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: colors.textPrimary, fontWeight: '500' }}>
              Remarks (optional)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
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

export default ApplicationDetails;
