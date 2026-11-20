import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, RefreshCw } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import Alert from './Alert';
import { describePublishCounts } from '../utils/format';
import { colors } from '../theme';

// Where an admin fixes a blocking issue. `intake` ids are what the CRM calls a
// courseId, and the guide routes `course` issues to the course page as well.
const issueLink = (issue) => {
  if (!issue?.id) return null;
  const entity = String(issue.entity ?? '').toLowerCase();
  if (entity === 'university') return `/universities/${issue.id}`;
  if (entity === 'course' || entity === 'intake') return `/courses/${issue.id}`;
  return null;
};

// Confirmation step shared by "publish batch" and "publish university".
//
//   loadPreview()  -> PublishPreviewResponse { counts, blockingIssues, canPublish }
//   onPublish()    -> { counts, publishedAt }
//   onPublished(r)    called after a successful publish; the parent closes the dialog
//   onConflict(err)   409: the item changed state under us; the parent refreshes
//
// Publishing cannot be undone, so it takes two deliberate steps: "Continue" on
// the preview, then "Yes, publish" on a second screen.
//
// Publishing is blocked while the preview lists blocking issues. A 422 from
// onPublish means items became unpublishable after the preview was shown; its
// body carries no issue list, so the preview is simply loaded again.
const PublishPreviewDialog = ({
  isOpen,
  onClose,
  title = 'Publish',
  note,
  loadPreview,
  onPublish,
  onPublished,
  onConflict,
}) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  // false = preview screen, true = the final "are you sure" screen.
  const [confirming, setConfirming] = useState(false);

  // Callers pass inline functions; read the latest through a ref so a parent
  // re-render does not re-run the preview request.
  const loadPreviewRef = useRef(loadPreview);
  useEffect(() => {
    loadPreviewRef.current = loadPreview;
  });
  const requestRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestRef.current;
    // A fresh preview always has to be read again before confirming.
    setConfirming(false);
    setLoading(true);
    setError('');
    try {
      const next = await loadPreviewRef.current();
      if (requestId !== requestRef.current) return;
      setPreview(next ?? null);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      console.error('Failed to load publish preview:', err);
      setPreview(null);
      setError(err.message || 'Could not check what will be published.');
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setPreview(null);
    refresh();
  }, [isOpen, refresh]);

  const confirm = async (event) => {
    // The second click of a double-click on "Continue" lands on this button,
    // which sits in the same place. Only a separate, single click publishes.
    if (event?.detail > 1) return;
    setPublishing(true);
    setError('');
    try {
      const result = await onPublish();
      onPublished?.(result);
    } catch (err) {
      console.error('Publish failed:', err);
      if (err.statusCode === 422) {
        await refresh();
        setError(err.message || 'Some items are not ready to publish.');
      } else if (err.statusCode === 409 && onConflict) {
        onConflict(err);
      } else {
        setError(err.message || 'Publishing failed.');
      }
    } finally {
      setPublishing(false);
    }
  };

  const issues = preview?.blockingIssues ?? [];
  const blocked = !!preview && preview.canPublish === false;
  const countsText = describePublishCounts(preview?.counts);
  const busy = loading || publishing;

  return (
    <Modal
      isOpen={isOpen}
      onClose={publishing ? () => {} : onClose}
      title={title}
      size="medium"
      footer={confirming ? (
        <>
          <Button variant="ghost" onClick={() => setConfirming(false)} disabled={publishing}>Back</Button>
          <Button onClick={confirm} disabled={publishing}>
            {publishing ? 'Publishing...' : 'Yes, publish'}
          </Button>
        </>
      ) : (
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {blocked && (
            <Button variant="secondary" icon={RefreshCw} onClick={refresh} disabled={busy}>
              {loading ? 'Checking...' : 'Check again'}
            </Button>
          )}
          <Button onClick={() => { setError(''); setConfirming(true); }} disabled={busy || !preview || blocked}>
            Continue
          </Button>
        </>
      )}
    >
      <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert>

      {loading && !preview && (
        <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Checking what will be published...</p>
      )}

      {preview && !confirming && (
        <>
          <p style={{ margin: '0 0 12px', fontSize: '14px', lineHeight: 1.6, color: colors.textPrimary }}>
            {countsText
              ? <>Publishing will make live: <strong>{countsText}</strong>.</>
              : 'Nothing new will go live.'}
          </p>
          {note && (
            <p style={{ margin: '0 0 12px', fontSize: '13px', lineHeight: 1.6, color: colors.textSecondary }}>{note}</p>
          )}
        </>
      )}

      {preview && confirming && (
        <>
          <p style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: '600', color: colors.textPrimary }}>
            Are you sure you want to publish?
          </p>
          <p style={{ margin: '0 0 12px', fontSize: '14px', lineHeight: 1.6, color: colors.textPrimary }}>
            {countsText
              ? <>This will make live: <strong>{countsText}</strong>.</>
              : 'Nothing new will go live.'}
          </p>
          <Alert variant="warning" style={{ marginBottom: 0 }}>
            Students will see this data straight away. It cannot be unpublished from the CRM.
          </Alert>
        </>
      )}

      {blocked && !confirming && (
        <>
          <Alert variant="warning" style={{ marginTop: '4px' }}>
            {issues.length
              ? `${issues.length} item${issues.length === 1 ? ' is' : 's are'} missing fields required for publishing. Fill them in, then check again.`
              : 'Some items are not ready to publish.'}
          </Alert>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {issues.map((issue, index) => {
              const to = issueLink(issue);
              return (
                <div
                  key={`${issue.entity}-${issue.id ?? index}`}
                  style={{
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px',
                    padding: '10px 12px', borderRadius: '8px',
                    border: `1px solid ${colors.borderLight}`, backgroundColor: colors.appBg,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: colors.textPrimary, overflowWrap: 'anywhere' }}>
                      {issue.name || 'Unnamed item'}
                      <span style={{
                        marginLeft: '8px', fontSize: '11px', fontWeight: '500',
                        textTransform: 'uppercase', letterSpacing: '0.04em', color: colors.textSecondary,
                      }}>
                        {issue.entity}
                      </span>
                    </div>
                    <div style={{ marginTop: '2px', fontSize: '13px', color: colors.textSecondary, overflowWrap: 'anywhere' }}>
                      Missing: {(issue.missingFields ?? []).join(', ') || 'required fields'}
                    </div>
                  </div>
                  {to && (
                    // New tab, so the list stays open while each item is fixed.
                    <Link
                      to={to}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0,
                        fontSize: '13px', fontWeight: '500', color: colors.brandPrimary,
                      }}
                    >
                      Open <ExternalLink size={13} />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Modal>
  );
};

export default PublishPreviewDialog;
