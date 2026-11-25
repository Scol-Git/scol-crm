// Small display helpers shared by the bulk import and draft/publish screens.

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDateTime = (value, fallback = '-') => {
  const date = toDate(value);
  return date ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : fallback;
};

export const formatDate = (value, fallback = '-') => {
  const date = toDate(value);
  return date ? date.toLocaleDateString(undefined, { dateStyle: 'medium' }) : fallback;
};

export const addDays = (value, days) => {
  const date = toDate(value);
  if (!date) return null;
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const formatBytes = (bytes) => {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return '-';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatCount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString() : '0';
};

// Order and wording for PublishPreviewResponse.counts.
const PUBLISH_COUNT_LABELS = [
  ['intakes', 'intake', 'intakes'],
  ['courses', 'course', 'courses'],
  ['universities', 'university', 'universities'],
  ['countries', 'country', 'countries'],
  ['states', 'state', 'states'],
  ['cities', 'city', 'cities'],
  ['programmes', 'programme', 'programmes'],
];

// { intakes: 20, courses: 12, universities: 1, states: 0 }
//   -> "20 intakes, 12 courses, 1 university". Zero counts are left out.
export const describePublishCounts = (counts) => PUBLISH_COUNT_LABELS
  .map(([key, singular, plural]) => {
    const n = Number(counts?.[key]) || 0;
    return n > 0 ? `${n.toLocaleString()} ${n === 1 ? singular : plural}` : null;
  })
  .filter(Boolean)
  .join(', ');

// Label for a "Back" link, given the path the user arrived from.
export const backLabelFor = (from, fallback) => {
  if (typeof from !== 'string') return fallback;
  if (from.startsWith('/bulk-imports')) return 'Back to import batch';
  if (from.startsWith('/universities/')) return 'Back to University';
  if (from.startsWith('/universities')) return 'Back to Universities';
  if (from.startsWith('/courses/')) return 'Back to Course';
  if (from.startsWith('/courses')) return 'Back to Courses';
  return fallback;
};
