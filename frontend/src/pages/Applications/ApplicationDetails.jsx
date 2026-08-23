import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Download,
  Upload,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Card, Button, Badge, Modal, Select, Alert } from '../../components';
import { applicationService, leadService } from '../../services';
import {
  APPLICATION_STATUS,
  applicationStatusVariant,
  APPLICATION_STAGE,
  applicationStageVariant,
  documentStatusVariant,
} from '../../services/mappers';
import { colors } from '../../theme';

// CrmApplicationActivityItemDto (verified live): the timestamp is `occurredAt`
// and the person is `actor.displayName`.
const normalizeActivity = (raw = {}) => ({
  id: raw.activityId ?? `${raw.occurredAt}-${raw.title}`,
  type: raw.activityType ?? null,
  title: raw.title ?? raw.activityType ?? 'Activity',
  description: raw.description ?? raw.remarks ?? '',
  actor: raw.actor?.displayName ?? null,
  date: raw.occurredAt ?? null,
});

// document-progress returns { totalRequired, uploadedCount, progressBarItems:
// [{ documentType: { documentTypeId, documentTypeCode, documentTypeName },
//    order, overallStatus }] }  -- verified live.
// A row is a *requirement* (the slot). Once a file exists it also has a
// *document* id. The two have separate endpoints and separate status enums, so
// both ids are kept.
const normalizeDocumentRequirement = (raw = {}) => {
  const dt = raw.documentType ?? {};
  const documentTypeId = dt.documentTypeId ?? raw.documentTypeId ?? raw.id ?? null;
  const document = raw.document ?? raw.latestDocument ?? raw.currentDocument ?? null;
  const documentId = raw.documentId ?? document?.id ?? null;

  return {
    documentTypeId,
    documentId,
    key: documentTypeId ?? documentId ?? raw.order,
    label: dt.documentTypeName ?? raw.name ?? raw.label ?? 'Document',
    code: dt.documentTypeCode ?? null,
    order: raw.order ?? 0,
    required: raw.isRequired ?? raw.required ?? true,
    // Requirement-level status (server calls it overallStatus).
    status: raw.overallStatus ?? raw.status ?? raw.requirementStatus ?? 'PENDING',
    // Document-level status (adds REJECTED); only once a file exists.
    documentStatus: raw.documentStatus ?? document?.status ?? null,
    fileName: raw.fileName ?? document?.fileName ?? document?.name ?? null,
    uploadedAt: raw.uploadedAt ?? document?.uploadedAt ?? document?.createdAt ?? null,
  };
};

// The list/create payloads key the note by `noteId`, not `id`. Reading `id`
// left every note with an undefined id, which made `editingNote?.id === note.id`
// true for all of them (undefined === undefined) - so every note rendered
// permanently in edit mode and Edit/Resolve/Delete were unreachable.
// The backend rejects these status changes without remarks (verified live):
//   ON_HOLD                        -> "Remarks are required for this application status"
//   COMPLETED/REJECTED/CANCELLED   -> "Remarks are required when moving to a
//                                      terminal application status"
// A stage change needs remarks whenever it moves backwards.
const STATUSES_REQUIRING_REMARKS = ['ON_HOLD', 'COMPLETED', 'REJECTED', 'CANCELLED'];

const normalizeNote = (raw) => ({
  id: raw.noteId ?? raw.id ?? null,
  description: raw.description,
  isResolved: !!raw.isResolved,
  createdAt: raw.createdAt ?? null,
});

// stage-progress returns { totalStages, completedStages, currentStage,
// progressBarItems: [{ stageCode, stageName, order, state }] } where state is
// COMPLETED | CURRENT | UPCOMING -- verified live.
const normalizeStageProgress = (raw) => {
  const list = Array.isArray(raw) ? raw : raw?.progressBarItems ?? raw?.stages ?? raw?.items ?? [];
  if (!Array.isArray(list) || list.length === 0) return [];
  return list
    .map((s2) => {
      const value = s2.stageCode ?? s2.stage ?? s2.value ?? s2.code;
      if (!value) return null;
      const state = String(s2.state ?? '').toUpperCase();
      return {
        value,
        label: s2.stageName ?? APPLICATION_STAGE.label(value),
        order: s2.order ?? 0,
        completed: state ? state === 'COMPLETED' : !!(s2.completed ?? s2.isCompleted),
        current: state ? state === 'CURRENT' : !!(s2.current ?? s2.isCurrent),
      };
    })
    .filter(Boolean)
    .sort((x, y) => x.order - y.order);
};

const ApplicationDetails = () => {
  const { id: applicationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [leadId, setLeadId] = useState(location.state?.leadId ?? null);
  const [application, setApplication] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [notes, setNotes] = useState([]);
  const [stageProgress, setStageProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [showStageModal, setShowStageModal] = useState(false);
  const [newStage, setNewStage] = useState('');
  const [remarks, setRemarks] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [savingAction, setSavingAction] = useState(false);
  const [docBusyKey, setDocBusyKey] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState('');

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
    setError('');
    try {
      // The API is nested under /crm/leads/{leadId}/applications/{applicationId} -
      // leadId normally arrives via navigation state from the Applications list;
      // on a direct URL visit, page through the list to find the owning lead.
      let resolvedLeadId = location.state?.leadId ?? null;
      if (!resolvedLeadId) {
        resolvedLeadId = await applicationService.findLeadId(applicationId);
      }
      if (!resolvedLeadId) {
        setApplication(null);
        setError('Could not find the lead this application belongs to.');
        return;
      }
      setLeadId(resolvedLeadId);

      const [appData, documentProgress, activityList, noteList, progress, leadProfile] = await Promise.all([
        applicationService.getById(resolvedLeadId, applicationId),
        applicationService.getDocumentProgress(resolvedLeadId, applicationId).catch(() => []),
        applicationService.getActivities(resolvedLeadId, applicationId).catch(() => []),
        applicationService.getNotes(resolvedLeadId, applicationId).catch(() => []),
        applicationService.getStageProgress(resolvedLeadId, applicationId).catch(() => null),
        // The application detail DTO carries no leadInfo, so the Applicant field
        // was always "-". Pull the name from the lead profile instead.
        leadService.getProfile(resolvedLeadId).catch(() => null),
      ]);

      const personal = leadProfile?.personal ?? null;
      setApplication(personal
        ? {
          ...appData,
          lead: {
            ...(appData.lead ?? {}),
            fullName: appData.lead?.fullName ?? personal.fullName ?? null,
            email: appData.lead?.email ?? personal.email ?? null,
            phone: appData.lead?.phone ?? personal.phoneNumber ?? null,
          },
        }
        : appData);
      setDocuments((Array.isArray(documentProgress)
        ? documentProgress
        : documentProgress?.progressBarItems ?? documentProgress?.items ?? []).map(normalizeDocumentRequirement));
      setActivities((Array.isArray(activityList) ? activityList : []).map(normalizeActivity));
      setNotes((Array.isArray(noteList) ? noteList : []).map(normalizeNote));
      setStageProgress(normalizeStageProgress(progress));
    } catch (err) {
      console.error('Failed to load application:', err);
      setError(err.message || 'Failed to load this application.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus || !leadId) return;
    setSavingAction(true);
    setActionError('');
    try {
      await applicationService.changeStatus(leadId, applicationId, { toStatus: newStatus, remarks: remarks.trim() || undefined });
      setShowStatusModal(false);
      setNewStatus('');
      setRemarks('');
      loadApplication();
    } catch (err) {
      console.error('Failed to update status:', err);
      setActionError(err.message || 'Failed to update status. Please try again.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleUpdateStage = async () => {
    if (!newStage || !leadId) return;
    setSavingAction(true);
    setActionError('');
    try {
      await applicationService.changeStage(leadId, applicationId, { toStage: newStage, remarks: remarks.trim() || undefined });
      setShowStageModal(false);
      setNewStage('');
      setRemarks('');
      loadApplication();
    } catch (err) {
      console.error('Failed to update stage:', err);
      setActionError(err.message || 'Failed to update stage. Please try again.');
    } finally {
      setSavingAction(false);
    }
  };

  // --- Documents -----------------------------------------------------------

  const handleDocumentStatus = async (doc, toStatus) => {
    if (!leadId) return;
    // REJECTED only exists on the document (file) enum, so a reject must target
    // an uploaded document; requirement slots use the shorter enum.
    const useDocument = !!doc.documentId && (toStatus === 'REJECTED' || !!doc.documentStatus);
    if (toStatus === 'REJECTED' && !doc.documentId) {
      setActionError('Nothing has been uploaded for this requirement yet, so it cannot be rejected.');
      return;
    }

    let remarks;
    if (toStatus === 'REJECTED') {
      remarks = window.prompt('Why is this document being rejected? (optional, max 500 chars)') ?? undefined;
    }

    setDocBusyKey(doc.key);
    setActionError('');
    try {
      if (useDocument) {
        await applicationService.changeDocumentStatus(leadId, applicationId, doc.documentId, {
          toStatus,
          remarks: remarks?.trim() || undefined,
        });
      } else {
        await applicationService.changeRequirementStatus(leadId, applicationId, doc.documentTypeId, {
          toStatus,
          remarks: remarks?.trim() || undefined,
        });
      }
      await loadApplication();
    } catch (err) {
      console.error('Failed to change document status:', err);
      setActionError(err.message || 'Failed to update the document status.');
    } finally {
      setDocBusyKey(null);
    }
  };

  const handleDownload = async (doc) => {
    if (!leadId || !doc.documentId) return;
    setDocBusyKey(doc.key);
    setActionError('');
    try {
      const res = await applicationService.getDocumentDownload(leadId, applicationId, doc.documentId);
      const url = typeof res === 'string' ? res : res?.downloadUrl ?? res?.url ?? res?.signedUrl;
      if (!url) throw new Error('The server did not return a download link.');
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      console.error('Failed to download document:', err);
      setActionError(err.message || 'Failed to download the document.');
    } finally {
      setDocBusyKey(null);
    }
  };

  const handleUpload = async (doc, file) => {
    if (!leadId || !file || !doc.documentTypeId) return;
    setDocBusyKey(doc.key);
    setActionError('');
    try {
      await applicationService.uploadDocument(leadId, applicationId, doc.documentTypeId, file);
      await loadApplication();
    } catch (err) {
      console.error('Failed to upload document:', err);
      setActionError(err.message || 'Failed to upload the document.');
    } finally {
      setDocBusyKey(null);
    }
  };

  // --- Notes ---------------------------------------------------------------

  const handleSaveNoteEdit = async () => {
    if (!leadId || !editingNote || !editingNoteText.trim()) return;
    setSavingAction(true);
    setActionError('');
    try {
      await applicationService.updateNote(leadId, applicationId, editingNote.id, {
        description: editingNoteText.trim(),
      });
      setEditingNote(null);
      setEditingNoteText('');
      await loadApplication();
    } catch (err) {
      console.error('Failed to update note:', err);
      setActionError(err.message || 'Failed to update the note.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleToggleNoteResolved = async (note) => {
    if (!leadId) return;
    setActionError('');
    try {
      await applicationService.updateNote(leadId, applicationId, note.id, { isResolved: !note.isResolved });
      await loadApplication();
    } catch (err) {
      console.error('Failed to update note:', err);
      setActionError(err.message || 'Failed to update the note.');
    }
  };

  const handleDeleteNote = async (note) => {
    if (!leadId) return;
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    setActionError('');
    try {
      await applicationService.deleteNote(leadId, applicationId, note.id);
      await loadApplication();
    } catch (err) {
      console.error('Failed to delete note:', err);
      setActionError(err.message || 'Failed to delete the note.');
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim() || !leadId) return;
    setSavingAction(true);
    setActionError('');
    try {
      await applicationService.addNote(leadId, applicationId, { description: noteContent.trim() });
      setNoteContent('');
      loadApplication();
    } catch (err) {
      console.error('Failed to add note:', err);
      setActionError(err.message || 'Failed to add note. Please try again.');
    } finally {
      setSavingAction(false);
    }
  };

  // The backend rejects these without remarks, so require them up front rather
  // than letting the user discover it via a 400.
  const statusNeedsRemarks = STATUSES_REQUIRING_REMARKS.includes(newStatus);

  // A stage move needs remarks when it goes backwards. stage-progress gives the
  // authoritative order; without it we cannot tell, so we don't force it.
  const stageOrder = (code) => stageProgress.find((s) => s.value === code)?.order ?? null;
  const currentStageOrder = stageOrder(application?.stage);
  const targetStageOrder = stageOrder(newStage);
  const stageNeedsRemarks =
    currentStageOrder != null && targetStageOrder != null && targetStageOrder < currentStageOrder;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ color: colors.textSecondary }}>Loading application details...</div>
      </div>
    );
  }

  if (!application) {
    return (
      <div style={{ maxWidth: '520px', margin: '40px auto', textAlign: 'center' }}>
        <h2 style={{ color: colors.textPrimary }}>Application not found</h2>
        {error && <Alert variant="error" style={{ textAlign: 'left', marginTop: '16px' }}>{error}</Alert>}
        <Button onClick={() => navigate('/applications')} style={{ marginTop: '16px' }}>
          Back to Applications
        </Button>
      </div>
    );
  }

  // Prefer this application's real progress from /stage-progress; fall back to
  // the generic stage list only when the endpoint gives us nothing.
  const usingLiveProgress = stageProgress.length > 0;
  const stageSteps = usingLiveProgress ? stageProgress : APPLICATION_STAGE.options;
  const currentStepIndex = usingLiveProgress
    ? (() => {
        const explicit = stageSteps.findIndex((s) => s.current);
        if (explicit >= 0) return explicit;
        const byStage = stageSteps.findIndex((s) => s.value === application.stage);
        if (byStage >= 0) return byStage;
        const lastCompleted = stageSteps.map((s) => !!s.completed).lastIndexOf(true);
        return lastCompleted;
      })()
    : stageSteps.findIndex((s) => s.value === application.stage);
  const isStepCompleted = (step, index) =>
    usingLiveProgress && step.completed !== undefined ? step.completed : index <= currentStepIndex;
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

      <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert>
      <Alert variant="error" onDismiss={() => setActionError('')}>{actionError}</Alert>

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
              const isCompleted = isStepCompleted(step, index);
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
                {documents.map((doc) => {
                  const effectiveStatus = doc.documentStatus ?? doc.status;
                  const busy = docBusyKey === doc.key;
                  const hasFile = !!doc.documentId;

                  return (
                    <div
                      key={doc.key}
                      style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        alignItems: isMobile ? 'stretch' : 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '12px 16px',
                        backgroundColor: colors.appBg,
                        borderRadius: '8px',
                        opacity: busy ? 0.6 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        {effectiveStatus === 'VERIFIED' ? (
                          <CheckCircle size={18} color={colors.success} style={{ flexShrink: 0 }} />
                        ) : (
                          <AlertCircle
                            size={18}
                            color={effectiveStatus === 'REJECTED' ? colors.error : (doc.required ? colors.warning : colors.textMuted)}
                            style={{ flexShrink: 0 }}
                          />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ color: colors.textPrimary }}>{doc.label}</span>
                            {doc.required && <Badge variant="warning" size="small">Required</Badge>}
                          </div>
                          {doc.fileName && (
                            <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '2px' }}>
                              {doc.fileName}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
                        <Badge variant={documentStatusVariant(effectiveStatus)}>
                          {effectiveStatus?.replace(/_/g, ' ') || 'Pending'}
                        </Badge>

                        {hasFile && (
                          <Button variant="ghost" size="small" icon={Download} disabled={busy} onClick={() => handleDownload(doc)}>
                            Download
                          </Button>
                        )}

                        {/* Upload / replace - presigned 3-step flow */}
                        {doc.documentTypeId && (
                          <label
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '13px',
                              color: colors.textSecondary,
                              cursor: busy ? 'default' : 'pointer',
                              padding: '4px 8px',
                            }}
                          >
                            <Upload size={14} />
                            {hasFile ? 'Replace' : 'Upload'}
                            <input
                              type="file"
                              disabled={busy}
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (file) handleUpload(doc, file);
                              }}
                            />
                          </label>
                        )}

                        {/* A requirement with no uploaded file cannot be
                            verified - the backend returns 400 "Requirement
                            cannot be marked as verified". */}
                        {hasFile && effectiveStatus !== 'VERIFIED' && (
                          <Button variant="ghost" size="small" disabled={busy} onClick={() => handleDocumentStatus(doc, 'VERIFIED')}>
                            Verify
                          </Button>
                        )}
                        {hasFile && effectiveStatus !== 'REJECTED' && (
                          <Button variant="ghost" size="small" disabled={busy} onClick={() => handleDocumentStatus(doc, 'REJECTED')}>
                            Reject
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                notes.map((note, index) => (
                  <div key={note.id ?? index} style={{ padding: '16px', backgroundColor: colors.appBg, borderRadius: '8px' }}>
                    {/* Guard on a truthy id so a missing one can never match. */}
                    {editingNote && note.id && editingNote.id === note.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <textarea
                          value={editingNoteText}
                          onChange={(e) => setEditingNoteText(e.target.value)}
                          style={{
                            width: '100%',
                            minHeight: '80px',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: `1px solid ${colors.borderLight}`,
                            fontSize: '14px',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            boxSizing: 'border-box',
                          }}
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <Button
                            variant="ghost"
                            size="small"
                            onClick={() => { setEditingNote(null); setEditingNoteText(''); }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="small"
                            onClick={handleSaveNoteEdit}
                            disabled={savingAction || !editingNoteText.trim()}
                          >
                            {savingAction ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <p style={{ margin: 0, color: colors.textPrimary, lineHeight: 1.6 }}>{note.description}</p>
                          {note.isResolved && <Badge variant="success" size="small">Resolved</Badge>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                          {note.createdAt ? (
                            <span style={{ fontSize: '11px', color: colors.textMuted }}>
                              {new Date(note.createdAt).toLocaleString()}
                            </span>
                          ) : <span />}
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <Button variant="ghost" size="small" onClick={() => handleToggleNoteResolved(note)}>
                              {note.isResolved ? 'Reopen' : 'Resolve'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="small"
                              icon={Pencil}
                              onClick={() => { setEditingNote(note); setEditingNoteText(note.description || ''); }}
                            >
                              Edit
                            </Button>
                            <Button variant="ghost" size="small" icon={Trash2} onClick={() => handleDeleteNote(note)}>
                              Delete
                            </Button>
                          </div>
                        </div>
                      </>
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
            <Button
              onClick={handleUpdateStatus}
              disabled={savingAction || !newStatus || (statusNeedsRemarks && !remarks.trim())}
            >
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
              {statusNeedsRemarks ? 'Remarks (required)' : 'Remarks (optional)'}
            </label>
            {statusNeedsRemarks && (
              <p style={{ margin: '-4px 0 8px', fontSize: '12px', color: colors.textSecondary }}>
                Moving to {APPLICATION_STATUS.label(newStatus)} requires a reason.
              </p>
            )}
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
            <Button
              onClick={handleUpdateStage}
              disabled={savingAction || !newStage || (stageNeedsRemarks && !remarks.trim())}
            >
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
              {stageNeedsRemarks ? 'Remarks (required)' : 'Remarks (optional)'}
            </label>
            {stageNeedsRemarks && (
              <p style={{ margin: '-4px 0 8px', fontSize: '12px', color: colors.textSecondary }}>
                Moving back to an earlier stage requires a reason.
              </p>
            )}
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
