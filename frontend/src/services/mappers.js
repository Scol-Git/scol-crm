// Enum <-> UI label/variant mappings for CRM Leads and CRM Applications.
// Backend enum values are used as-is for API payloads/filters; these maps only
// control how they're displayed (label) and colored (Badge variant).

const buildLookup = (entries) => {
  const byValue = Object.fromEntries(entries.map(([value, label]) => [value, label]));
  return {
    options: entries.map(([value, label]) => ({ value, label })),
    label: (value) => byValue[value] || value || '-',
  };
};

// --- Leads -----------------------------------------------------------------

export const LEAD_STATUS = buildLookup([
  ['NewLead', 'New Lead'],
  ['Eligible', 'Eligible'],
  ['NotEligible', 'Not Eligible'],
  ['Unreachable', 'Unreachable'],
  ['Visited', 'Visited'],
]);

const LEAD_STATUS_VARIANTS = {
  NewLead: 'info',
  Eligible: 'success',
  NotEligible: 'error',
  Unreachable: 'warning',
  Visited: 'default',
};
export const leadStatusVariant = (status) => LEAD_STATUS_VARIANTS[status] || 'default';

export const REGISTER_SOURCE = buildLookup([
  ['Online', 'Online'],
  ['Offline', 'Offline'],
  ['LoggedIn', 'Logged In'],
]);

export const ENROLLMENT_STATUS = buildLookup([
  ['Online', 'Online'],
  ['Offline', 'Offline'],
]);

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

// --- Applications ------------------------------------------------------------

export const APPLICATION_STATUS = buildLookup([
  ['IN_PROGRESS', 'In Progress'],
  ['PENDING', 'Pending'],
  ['ON_HOLD', 'On Hold'],
  ['COMPLETED', 'Completed'],
  ['REJECTED', 'Rejected'],
  ['CANCELLED', 'Cancelled'],
]);

const APPLICATION_STATUS_VARIANTS = {
  IN_PROGRESS: 'info',
  PENDING: 'warning',
  ON_HOLD: 'warning',
  COMPLETED: 'success',
  REJECTED: 'error',
  CANCELLED: 'error',
};
export const applicationStatusVariant = (status) => APPLICATION_STATUS_VARIANTS[status] || 'default';

export const APPLICATION_STAGE = buildLookup([
  ['REVIEW', 'Review'],
  ['SUBMITTED', 'Submitted'],
  ['CONDITIONAL', 'Conditional Offer'],
  ['UNCONDITIONAL', 'Unconditional Offer'],
  ['INTERVIEW', 'Interview'],
  ['PAYMENT', 'Payment'],
  ['CAS_COE', 'CAS/COE'],
  ['VISA', 'VISA'],
  ['ENROLLED', 'Enrolled'],
  ['COLLECT_COMMISSION', 'Collect Commission'],
  ['COMPLETED', 'Completed'],
]);

const APPLICATION_STAGE_VARIANTS = {
  REVIEW: 'default',
  SUBMITTED: 'info',
  CONDITIONAL: 'warning',
  UNCONDITIONAL: 'warning',
  INTERVIEW: 'info',
  PAYMENT: 'warning',
  CAS_COE: 'info',
  VISA: 'info',
  ENROLLED: 'success',
  COLLECT_COMMISSION: 'success',
  COMPLETED: 'success',
};
export const applicationStageVariant = (stage) => APPLICATION_STAGE_VARIANTS[stage] || 'default';

export const DOCUMENT_STATUS = buildLookup([
  ['PENDING', 'Pending'],
  ['IN_PROGRESS', 'In Progress'],
  ['REJECTED', 'Rejected'],
  ['VERIFIED', 'Verified'],
]);

export const REQUIREMENT_STATUS = buildLookup([
  ['PENDING', 'Pending'],
  ['IN_PROGRESS', 'In Progress'],
  ['VERIFIED', 'Verified'],
]);

const DOCUMENT_STATUS_VARIANTS = {
  PENDING: 'default',
  IN_PROGRESS: 'info',
  REJECTED: 'error',
  VERIFIED: 'success',
};
export const documentStatusVariant = (status) => DOCUMENT_STATUS_VARIANTS[status] || 'default';

// --- Bulk imports + draft/publish ---------------------------------------------

export const BULK_IMPORT_TYPE = buildLookup([
  ['UNIVERSITY', 'University'],
  ['COURSE', 'Course'],
]);

export const BULK_IMPORT_STATUS = buildLookup([
  ['AWAITING_UPLOAD', 'Awaiting upload'], // batch created, file not confirmed yet
  ['QUEUED', 'Queued'],                   // waiting for the worker
  ['PROCESSING', 'Processing'],           // worker is importing rows
  ['IN_REVIEW', 'In review'],             // drafts created, ready to review/publish
  ['NO_CHANGES', 'No changes'],           // file processed, nothing new to import
  ['FAILED', 'Failed'],                   // whole file rejected, see failureReason
  ['PUBLISHED', 'Published'],             // drafts are live
  ['DISCARDED', 'Discarded'],             // drafts deleted
]);

// 'muted' is not a Badge variant; BulkImportStatusChip draws it itself.
const BULK_IMPORT_STATUS_VARIANTS = {
  AWAITING_UPLOAD: 'default',
  QUEUED: 'info',
  PROCESSING: 'info',
  IN_REVIEW: 'warning',
  NO_CHANGES: 'default',
  FAILED: 'error',
  PUBLISHED: 'success',
  DISCARDED: 'muted',
};
export const bulkImportStatusVariant = (status) => BULK_IMPORT_STATUS_VARIANTS[status] || 'default';

// The worker has the batch: these are the statuses worth polling.
export const isBulkImportInFlight = (status) => status === 'QUEUED' || status === 'PROCESSING';

const BULK_IMPORT_SETTLED = ['IN_REVIEW', 'NO_CHANGES', 'FAILED', 'PUBLISHED', 'DISCARDED'];

// The status endpoint sends isFinal; fall back to the enum if it is absent.
export const isBulkImportFinal = (statusDto) => (
  typeof statusDto?.isFinal === 'boolean' ? statusDto.isFinal : BULK_IMPORT_SETTLED.includes(statusDto?.status)
);

// "Actions allowed per status" from the bulk import guide, in one place so the
// list, the detail page and the dialogs cannot drift apart.
export const bulkImportActions = (batch) => {
  const status = batch?.status;
  const filesGone = !!batch?.filesDeletedAt;
  const hasFiles = status !== 'AWAITING_UPLOAD' && !filesGone;
  return {
    canReview: status === 'IN_REVIEW',
    canPublish: status === 'IN_REVIEW',
    canDiscard: ['IN_REVIEW', 'NO_CHANGES', 'FAILED'].includes(status),
    canDownloadOriginal: hasFiles && !!batch?.hasOriginalFile,
    // No errors file can exist while the worker is still running.
    canDownloadErrors: hasFiles && !isBulkImportInFlight(status) && !!batch?.hasErrorsFile,
  };
};

export const PUBLISH_STATUS = buildLookup([
  ['PUBLISHED', 'Published'],
  ['DRAFT', 'Drafts'],
  ['ALL', 'All'],
]);
export const isPublishStatus = (value) => ['PUBLISHED', 'DRAFT', 'ALL'].includes(value);
