import { useRef, useState } from 'react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { Modal, Button, Alert, ProgressBar, SegmentedControl } from '../../components';
import { bulkImportService } from '../../services/bulkImportService';
import { uploadFile } from '../../services/apiClient';
import { BULK_IMPORT_TYPE } from '../../services/mappers';
import { useBulkImportPolling } from '../../hooks/useBulkImportPolling';
import { formatBytes, formatCount } from '../../utils/format';
import { colors } from '../../theme';

// Upload flow (guide §5.1):
//   1. POST upload-url           -> batchId + pre-signed uploadUrl (15 min)
//   2. PUT the file to uploadUrl    (straight to storage, with progress)
//   3. POST confirm-upload       -> QUEUED
//   4. poll status until final   -> open the batch
//
// The batch belongs to the server from step 3 on: closing this dialog, or the
// tab, does not stop the import.

// Mirrors the backend default BULK_IMPORT_MAX_FILE_BYTES. The 20,000 row cap
// is enforced by the worker (the batch becomes FAILED), not here.
const MAX_FILE_BYTES = 20 * 1024 * 1024;

const validateFile = (file) => {
  if (!file) return 'Choose a CSV file to upload.';
  if (!/\.csv$/i.test(file.name)) return 'Only .csv files can be imported. In Excel use "Save As → CSV UTF-8".';
  if (file.size === 0) return 'This file is empty.';
  if (file.size > MAX_FILE_BYTES) return `This file is ${formatBytes(file.size)}. The maximum is 20 MB.`;
  return '';
};

const describeFailure = (stage, err) => {
  if (stage === 'upload') {
    return `${err.message || 'The file could not be sent to storage.'} Press Upload to try again.`;
  }
  // "File not found in storage. Upload it first." - the PUT did not land.
  if (stage === 'confirm' && err.statusCode === 400) {
    return 'The file did not reach storage. Press Upload to try again.';
  }
  return err.message || 'The import could not be started.';
};

const NewImportModal = ({ onClose, onFinished }) => {
  const [type, setType] = useState('UNIVERSITY');
  const [file, setFile] = useState(null);
  const [phase, setPhase] = useState('form'); // form | uploading | processing
  const [uploadProgress, setUploadProgress] = useState(0);
  const [batchId, setBatchId] = useState(null);
  const [error, setError] = useState('');
  const [templateBusy, setTemplateBusy] = useState(false);

  // The batch created by upload-url, kept until it is confirmed. A retry after
  // a failed PUT reuses it instead of leaving a second AWAITING_UPLOAD batch.
  const pendingRef = useRef(null);

  const { status: live, error: pollError } = useBulkImportPolling(batchId, {
    enabled: phase === 'processing',
    onFinal: (final) => onFinished(final?.batchId ?? batchId),
  });

  const downloadTemplate = async () => {
    setTemplateBusy(true);
    setError('');
    try {
      await bulkImportService.downloadTemplate(type);
    } catch (err) {
      console.error('Failed to download template:', err);
      setError(err.message || 'Could not download the template.');
    } finally {
      setTemplateBusy(false);
    }
  };

  const pickFile = (e) => {
    const picked = e.target.files?.[0] ?? null;
    setFile(picked);
    setError(picked ? validateFile(picked) : '');
  };

  const start = async () => {
    const problem = validateFile(file);
    if (problem) {
      setError(problem);
      return;
    }

    setError('');
    setUploadProgress(0);
    setPhase('uploading');

    let stage = 'prepare';
    try {
      let pending = pendingRef.current;
      const reusable = pending
        && pending.file === file
        && pending.type === type
        // Leave a minute of margin on the 15-minute signed URL.
        && new Date(pending.expiresAt).getTime() - Date.now() > 60 * 1000;

      if (!reusable) {
        const created = await bulkImportService.createUploadUrl({
          type,
          fileName: file.name,
          fileSizeBytes: file.size,
        });
        pending = { ...created, file, type };
        pendingRef.current = pending;
      }

      stage = 'upload';
      await uploadFile(pending.uploadUrl, file, { onProgress: setUploadProgress });

      stage = 'confirm';
      try {
        await bulkImportService.confirmUpload(pending.batchId);
      } catch (err) {
        // 409 "Batch is not awaiting upload": it was already confirmed (a retry
        // after a lost response). The import is running, so just watch it.
        if (err.statusCode !== 409) throw err;
      }

      pendingRef.current = null;
      setBatchId(pending.batchId);
      setPhase('processing');
    } catch (err) {
      console.error(`Bulk import failed at "${stage}":`, err);
      setError(describeFailure(stage, err));
      setPhase('form');
    }
  };

  const typeLabel = BULK_IMPORT_TYPE.label(type).toLowerCase();
  const fileProblem = file ? validateFile(file) : '';

  const totalRows = Number(live?.totalRows) || 0;
  const processedRows = Number(live?.processedRows) || 0;
  // totalRows stays 0 until the worker has parsed the file.
  const rowsKnown = live?.status === 'PROCESSING' && totalRows > 0;

  const footer = phase === 'form' ? (
    <>
      <Button variant="ghost" onClick={onClose}>Cancel</Button>
      <Button icon={Upload} onClick={start} disabled={!file || !!fileProblem}>Upload</Button>
    </>
  ) : phase === 'processing' ? (
    <>
      <Button variant="ghost" onClick={onClose}>Close</Button>
      <Button onClick={() => onFinished(batchId)}>Open batch</Button>
    </>
  ) : undefined;

  return (
    <Modal
      isOpen
      // Closing mid-PUT would abandon the upload before it can be confirmed.
      onClose={phase === 'uploading' ? () => {} : onClose}
      title="New import"
      size="medium"
      footer={footer}
    >
      <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert>

      {phase === 'form' && (
        <>
          <div style={{ marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: colors.textPrimary }}>
            What are you importing?
          </div>
          <SegmentedControl
            ariaLabel="Import type"
            options={BULK_IMPORT_TYPE.options}
            value={type}
            onChange={setType}
          />
          <p style={{ margin: '8px 0 16px', fontSize: '13px', lineHeight: 1.5, color: colors.textSecondary }}>
            {type === 'COURSE'
              ? 'One CSV per university. The university has to be in the CRM already, so import universities first. applicationDeadline is DD-MM-YYYY, for example 30-06-2027. tuitionFee and currency must both be filled, or both left empty.'
              : 'One CSV with one university per row.'}
            {' '}Rows are imported as drafts. Nothing goes live until you publish the batch.
          </p>

          <Button variant="secondary" size="small" icon={Download} onClick={downloadTemplate} disabled={templateBusy}>
            {templateBusy ? 'Downloading...' : `Download ${typeLabel} template`}
          </Button>

          <label
            htmlFor="bulk-import-file"
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              marginTop: '16px', padding: '16px', borderRadius: '10px', cursor: 'pointer',
              border: `1px dashed ${fileProblem ? colors.error : colors.textMuted}`,
              backgroundColor: colors.appBg,
            }}
          >
            <FileSpreadsheet size={28} style={{ color: colors.brandPrimary, flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: colors.textPrimary, overflowWrap: 'anywhere' }}>
                {file ? file.name : 'Choose a .csv file'}
              </div>
              <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                {file ? formatBytes(file.size) : 'CSV UTF-8, up to 20 MB and 20,000 rows'}
              </div>
            </div>
            <span style={{ fontSize: '13px', fontWeight: '500', color: colors.brandPrimary, flexShrink: 0 }}>
              {file ? 'Change' : 'Browse'}
            </span>
          </label>
          <input
            id="bulk-import-file"
            type="file"
            accept=".csv,text/csv"
            onChange={pickFile}
            // Visually hidden but still focusable; the label above is the control.
            style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, overflow: 'hidden' }}
          />
        </>
      )}

      {phase === 'uploading' && (
        <div style={{ padding: '8px 0' }}>
          <ProgressBar
            label={`Uploading ${file?.name ?? 'file'}`}
            value={uploadProgress}
          />
          <p style={{ margin: '12px 0 0', fontSize: '13px', color: colors.textSecondary }}>
            Keep this window open until the upload finishes.
          </p>
        </div>
      )}

      {phase === 'processing' && (
        <div style={{ padding: '8px 0' }}>
          <Alert variant="error">{pollError}</Alert>
          {!pollError && (
            <ProgressBar
              label={rowsKnown ? 'Importing rows' : live?.status === 'PROCESSING' ? 'Reading the file' : 'Waiting for the import worker'}
              value={rowsKnown ? processedRows / totalRows : null}
              detail={rowsKnown ? `${formatCount(processedRows)} of ${formatCount(totalRows)} rows` : undefined}
            />
          )}
          <p style={{ margin: '12px 0 0', fontSize: '13px', lineHeight: 1.5, color: colors.textSecondary }}>
            {pollError
              ? 'The import itself may still be running. Open the batch to see where it is.'
              : 'You can close this window. The import keeps running and shows up in the Bulk Imports list.'}
          </p>
        </div>
      )}
    </Modal>
  );
};

export default NewImportModal;
