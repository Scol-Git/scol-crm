import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileWarning, ListChecks, Send, Trash2 } from 'lucide-react';
import {
  Card, Button, Badge, Alert, ProgressBar, BulkImportStatusChip, ConfirmDialog, PublishPreviewDialog,
} from '../../components';
import { useToast } from '../../context';
import { bulkImportService } from '../../services/bulkImportService';
import { BULK_IMPORT_TYPE, bulkImportActions, isBulkImportInFlight } from '../../services/mappers';
import { useBulkImportPolling } from '../../hooks/useBulkImportPolling';
import {
  addDays, describePublishCounts, formatBytes, formatCount, formatDate, formatDateTime,
} from '../../utils/format';
import { colors } from '../../theme';

// GET /crm/bulk-imports/{batchId} - ADMIN only. Summary, files, the link to
// review the drafts, and Publish / Discard.

// Uploaded files are permanently deleted this long after upload (backend job).
const FILE_RETENTION_DAYS = 30;

const Row = ({ label, value }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    gap: '16px', padding: '10px 0', borderBottom: `1px solid ${colors.borderLight}`,
  }}>
    <span style={{ fontSize: '13px', color: colors.textSecondary, flexShrink: 0 }}>{label}</span>
    <span style={{ fontSize: '14px', fontWeight: '500', color: colors.textPrimary, textAlign: 'right', overflowWrap: 'anywhere' }}>
      {value ?? '-'}
    </span>
  </div>
);

const Stat = ({ label, value, color }) => (
  <div style={{
    padding: '14px 16px', borderRadius: '10px',
    backgroundColor: colors.appBg, border: `1px solid ${colors.borderLight}`,
  }}>
    <div style={{ fontSize: '22px', fontWeight: '700', color: color ?? colors.textPrimary }}>{formatCount(value)}</div>
    <div style={{ fontSize: '12px', color: colors.textSecondary }}>{label}</div>
  </div>
);

const BulkImportDetails = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Set when a download answered 410 Gone, in case the detail has not caught up.
  const [filesGone, setFilesGone] = useState(false);
  const [downloading, setDownloading] = useState(''); // '' | 'original' | 'errors'

  const [showPublish, setShowPublish] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [discardError, setDiscardError] = useState('');

  const requestRef = useRef(0);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // silent = refresh in place after an action: no spinner, keep what is shown.
  const load = useCallback(async ({ silent = false } = {}) => {
    const requestId = ++requestRef.current;
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await bulkImportService.getById(batchId);
      if (requestId !== requestRef.current) return;
      setBatch(data ?? null);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      console.error('Failed to load bulk import:', err);
      setError(err.message || 'Failed to load this import.');
      if (!silent) setBatch(null);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    setFilesGone(false);
    load();
  }, [load]);

  // While the worker has the batch, follow it and reload once it settles.
  const inFlight = isBulkImportInFlight(batch?.status);
  const { status: live, error: pollError } = useBulkImportPolling(batchId, {
    enabled: inFlight,
    onFinal: () => load({ silent: true }),
  });

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: colors.textSecondary }}>Loading import...</div>;
  }

  if (!batch) {
    return (
      <div style={{ maxWidth: '520px', margin: '40px auto', textAlign: 'center' }}>
        <h2 style={{ color: colors.textPrimary }}>Import not found</h2>
        {error && <Alert variant="error" style={{ textAlign: 'left', marginTop: '16px' }}>{error}</Alert>}
        <Button onClick={() => navigate('/bulk-imports')} style={{ marginTop: '16px' }}>Back to Bulk Imports</Button>
      </div>
    );
  }

  // Live numbers while processing; the stored detail otherwise.
  const view = inFlight && live ? { ...batch, ...live } : batch;
  // Buttons follow the stored detail only, so nothing is offered on the
  // strength of a status the detail request has not confirmed yet.
  const actions = bulkImportActions(batch);

  const ownedDraftCount = Number(batch.ownedDraftCount) || 0;
  const filesDeleted = filesGone || !!batch.filesDeletedAt;
  const filesAvailableUntil = addDays(batch.createdAt, FILE_RETENTION_DAYS);
  const isCourseBatch = batch.type === 'COURSE';
  const reviewPath = `${isCourseBatch ? '/courses' : '/universities'}?publishStatus=DRAFT&importBatchId=${encodeURIComponent(batchId)}`;

  const totalRows = Number(view.totalRows) || 0;
  const processedRows = Number(view.processedRows) || 0;
  const rowsKnown = view.status === 'PROCESSING' && totalRows > 0;

  const download = async (kind) => {
    setDownloading(kind);
    setError('');
    try {
      const data = kind === 'errors'
        ? await bulkImportService.getErrorsFileUrl(batchId)
        : await bulkImportService.getOriginalFileUrl(batchId);
      if (!data?.downloadUrl) throw new Error('The server did not return a download link.');
      // A same-tab navigation to a file download leaves this page in place and,
      // unlike window.open after an await, is not stopped by popup blockers.
      window.location.assign(data.downloadUrl);
    } catch (err) {
      console.error(`Failed to download ${kind} file:`, err);
      if (err.statusCode === 410) {
        // Deleted by the 30-day cleanup since this page was loaded.
        setFilesGone(true);
        load({ silent: true });
      } else {
        setError(err.message || 'Could not get the download link.');
        if (err.statusCode === 404) load({ silent: true });
      }
    } finally {
      setDownloading('');
    }
  };

  const discard = async () => {
    setDiscarding(true);
    setDiscardError('');
    try {
      await bulkImportService.discard(batchId);
      setShowDiscard(false);
      toast.success(ownedDraftCount > 0
        ? `Import discarded. ${formatCount(ownedDraftCount)} draft${ownedDraftCount === 1 ? '' : 's'} deleted.`
        : 'Import discarded.');
      await load({ silent: true });
    } catch (err) {
      console.error('Failed to discard bulk import:', err);
      if (err.statusCode === 409) {
        // No longer IN_REVIEW / NO_CHANGES / FAILED: someone else acted on it.
        setShowDiscard(false);
        toast.error(err.message || 'This import can no longer be discarded.');
        load({ silent: true });
      } else {
        setDiscardError(err.message || 'Failed to discard this import.');
      }
    } finally {
      setDiscarding(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => navigate('/bulk-imports')}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent',
          border: 'none', color: colors.textSecondary, cursor: 'pointer',
          marginBottom: '20px', fontSize: '14px', fontFamily: 'inherit', padding: 0,
        }}
      >
        <ArrowLeft size={18} /> Back to Bulk Imports
      </button>

      <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert>

      {/* Header */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', gap: '16px',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'flex-start',
        }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: '0 0 10px', fontSize: isMobile ? '18px' : '22px', color: colors.textPrimary, overflowWrap: 'anywhere' }}>
              {batch.fileName || 'Import'}
            </h1>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <BulkImportStatusChip status={view.status} size="medium" />
              <Badge size="small">{BULK_IMPORT_TYPE.label(batch.type)} import</Badge>
            </div>
          </div>

          {(actions.canPublish || actions.canDiscard) && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flexShrink: 0 }}>
              {actions.canDiscard && (
                <Button variant="secondary" icon={Trash2} onClick={() => { setDiscardError(''); setShowDiscard(true); }}>
                  Discard
                </Button>
              )}
              {actions.canPublish && (
                <Button icon={Send} onClick={() => setShowPublish(true)}>Publish</Button>
              )}
            </div>
          )}
        </div>

        {inFlight && (
          <div style={{ marginTop: '20px' }}>
            {pollError ? (
              <Alert variant="warning" style={{ marginBottom: 0 }}>
                Live progress stopped updating ({pollError}). Reload the page to see the current status.
              </Alert>
            ) : (
              <ProgressBar
                label={rowsKnown ? 'Importing rows' : view.status === 'PROCESSING' ? 'Reading the file' : 'Waiting for the import worker'}
                value={rowsKnown ? processedRows / totalRows : null}
                detail={rowsKnown ? `${formatCount(processedRows)} of ${formatCount(totalRows)} rows` : undefined}
              />
            )}
          </div>
        )}
      </Card>

      {view.status === 'FAILED' && (
        <Alert variant="error">
          <strong>The file was rejected.</strong>{' '}
          {/* File-level reason from the worker, shown verbatim. */}
          {view.failureReason || 'No reason was given.'}
        </Alert>
      )}
      {batch.status === 'AWAITING_UPLOAD' && (
        <Alert variant="info">
          The file for this import was never uploaded. The server marks an import like this as failed 24 hours after it was started.
        </Alert>
      )}
      {batch.status === 'NO_CHANGES' && (
        <Alert variant="info">The file was processed, but it contained nothing new to import.</Alert>
      )}
      {batch.status === 'PUBLISHED' && (
        <Alert variant="success">
          Published{batch.publishedAt ? ` on ${formatDateTime(batch.publishedAt)}` : ''}. The items from this upload are live.
        </Alert>
      )}
      {batch.status === 'DISCARDED' && (
        <Alert variant="info">This import was discarded. Its drafts were deleted; published data was not affected.</Alert>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '24px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
          <Card title="Summary">
            <div style={{
              display: 'grid', gap: '12px',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(130px, 1fr))',
            }}>
              <Stat label="Rows in file" value={view.totalRows} />
              <Stat label="Created" value={view.createdCount} />
              <Stat label="Updated" value={view.updatedCount} />
              <Stat label="Skipped" value={view.skippedCount} />
              <Stat label="Errors" value={view.errorCount} color={Number(view.errorCount) > 0 ? colors.error : undefined} />
              <Stat label="Warnings" value={view.warningCount} color={Number(view.warningCount) > 0 ? '#B45309' : undefined} />
              {(batch.status === 'PUBLISHED' || Number(batch.publishedCount) > 0) && (
                <Stat label="Published" value={batch.publishedCount} color={colors.success} />
              )}
            </div>
          </Card>

          {actions.canReview && (
            <Card title="Review drafts">
              <p style={{ margin: '0 0 8px', fontSize: '14px', color: colors.textPrimary }}>
                <strong>{formatCount(ownedDraftCount)}</strong> draft{ownedDraftCount === 1 ? '' : 's'} from this upload
                {ownedDraftCount === 1 ? ' is' : ' are'} waiting for review.
              </p>
              {ownedDraftCount < (Number(batch.createdCount) || 0) && (
                <p style={{ margin: '0 0 8px', fontSize: '13px', color: colors.textSecondary }}>
                  Some drafts were moved to a newer upload of the same file or deleted.
                </p>
              )}
              <p style={{ margin: '0 0 16px', fontSize: '13px', lineHeight: 1.5, color: colors.textSecondary }}>
                Drafts are hidden from students until this import is published. Open them to check and edit, then come back here to publish.
              </p>
              <Button variant="secondary" icon={ListChecks} onClick={() => navigate(reviewPath)}>
                {isCourseBatch ? 'Review draft courses' : 'Review draft universities'}
              </Button>
            </Card>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
          <Card title="Files">
            {filesDeleted ? (
              <p style={{ fontSize: '14px', color: colors.textSecondary }}>
                Files deleted after {FILE_RETENTION_DAYS} days{batch.filesDeletedAt ? ` (on ${formatDate(batch.filesDeletedAt)})` : ''}.
              </p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {actions.canDownloadOriginal && (
                    <Button variant="secondary" icon={Download} fullWidth disabled={!!downloading} onClick={() => download('original')}>
                      {downloading === 'original' ? 'Preparing...' : 'Download original file'}
                    </Button>
                  )}
                  {actions.canDownloadErrors && (
                    <Button variant="secondary" icon={FileWarning} fullWidth disabled={!!downloading} onClick={() => download('errors')}>
                      {downloading === 'errors' ? 'Preparing...' : 'Download errors file'}
                    </Button>
                  )}
                </div>
                {!actions.canDownloadOriginal && !actions.canDownloadErrors && (
                  <p style={{ fontSize: '14px', color: colors.textSecondary }}>No files to download.</p>
                )}
                {actions.canDownloadErrors && (
                  <p style={{ margin: '12px 0 0', fontSize: '12px', lineHeight: 1.5, color: colors.textSecondary }}>
                    The errors file is your upload plus rowNumber, severity, errorCode and errorMessage.
                    ERROR rows were not imported; WARNING rows were imported with a note.
                    Fix the rows and upload the file again. Re-uploading does not create duplicates.
                  </p>
                )}
                {filesAvailableUntil && (actions.canDownloadOriginal || actions.canDownloadErrors) && (
                  <p style={{ margin: '12px 0 0', fontSize: '12px', color: colors.textSecondary }}>
                    Available until {formatDate(filesAvailableUntil)}.
                  </p>
                )}
              </>
            )}
          </Card>

          <Card title="Details">
            <Row label="Type" value={BULK_IMPORT_TYPE.label(batch.type)} />
            <Row label="File size" value={batch.fileSizeBytes != null ? formatBytes(batch.fileSizeBytes) : null} />
            {/* uploadedBy.name is the uploader's email. */}
            <Row label="Uploaded by" value={batch.uploadedBy?.name} />
            <Row label="Uploaded at" value={formatDateTime(batch.createdAt)} />
            <Row label="Started" value={formatDateTime(batch.startedAt)} />
            <Row label="Processed" value={formatDateTime(batch.processedAt)} />
            <Row label="Published" value={formatDateTime(batch.publishedAt)} />
          </Card>
        </div>
      </div>

      <PublishPreviewDialog
        isOpen={showPublish}
        onClose={() => setShowPublish(false)}
        title="Publish this import"
        loadPreview={() => bulkImportService.publishPreview(batchId)}
        onPublish={() => bulkImportService.publish(batchId)}
        onPublished={(result) => {
          setShowPublish(false);
          const summary = describePublishCounts(result?.counts);
          toast.success(summary ? `Published: ${summary}.` : 'Import published.');
          load({ silent: true });
        }}
        onConflict={(err) => {
          // Not IN_REVIEW any more: someone else published or discarded it.
          setShowPublish(false);
          toast.error(err.message || 'This import can no longer be published.');
          load({ silent: true });
        }}
      />

      <ConfirmDialog
        isOpen={showDiscard}
        onClose={() => setShowDiscard(false)}
        onConfirm={discard}
        title="Discard this import"
        confirmLabel="Discard"
        busyLabel="Discarding..."
        busy={discarding}
        error={discardError}
      >
        {ownedDraftCount > 0
          ? `Delete all ${formatCount(ownedDraftCount)} draft${ownedDraftCount === 1 ? '' : 's'} created by this upload?`
          : 'Discard this upload? It has no drafts to delete.'}
        {' '}Published data is not affected. The uploaded files stay downloadable until {FILE_RETENTION_DAYS} days after upload.
      </ConfirmDialog>
    </div>
  );
};

export default BulkImportDetails;
