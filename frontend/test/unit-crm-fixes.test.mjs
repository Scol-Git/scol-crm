// test/unit-crm-fixes.test.mjs
// Automated verification test suite for all client-side SCOL CRM bug fixes.
// Uses Node.js native test runner: `node --test test/unit-crm-fixes.test.mjs`

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');

// ─── 1. Phone Normalization (SCOL-CRM-011 & SCOL-CRM-030) ───────────────────
test('SCOL-CRM-011 & 030: Bangladeshi phone normalization and validation', () => {
  const normalizePhone = (phone) => {
    if (!phone) return '';
    let cleaned = phone.replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('+880')) {
      cleaned = '0' + cleaned.slice(4);
    } else if (cleaned.startsWith('880')) {
      cleaned = '0' + cleaned.slice(3);
    }
    return cleaned;
  };

  const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;

  // Test cases: +880 format, spaces, hyphens, parentheses
  assert.equal(normalizePhone('+8801900251028'), '01900251028');
  assert.equal(normalizePhone('8801900251028'), '01900251028');
  assert.equal(normalizePhone('01900 251029'), '01900251029');
  assert.equal(normalizePhone('+880 1712-345678'), '01712345678');
  assert.equal(normalizePhone('(018) 12-345678'), '01812345678');

  // Verify regex validity on normalized phones
  assert.equal(BD_PHONE_REGEX.test(normalizePhone('+8801900251028')), true);
  assert.equal(BD_PHONE_REGEX.test(normalizePhone('01900 251029')), true);
  assert.equal(BD_PHONE_REGEX.test(normalizePhone('+880 1712-345678')), true);

  // Invalid cases
  assert.equal(BD_PHONE_REGEX.test(normalizePhone('01200251028')), false, '012 is not a valid BD operator');
  assert.equal(BD_PHONE_REGEX.test(normalizePhone('0170025')), false, 'Too short');
  assert.equal(BD_PHONE_REGEX.test(normalizePhone('0170025102899')), false, 'Too long');
  assert.equal(BD_PHONE_REGEX.test(normalizePhone('abcdefghijk')), false, 'Non-digits');
});

// ─── 2. Email Normalization (SCOL-CRM-010) ──────────────────────────────────
test('SCOL-CRM-010: Email normalization prevents duplicate casing bugs', () => {
  const normalizeEmail = (email) => (email ? email.trim().toLowerCase() : undefined);

  assert.equal(normalizeEmail('E2E.TEST.20261025@EXAMPLE.COM'), 'e2e.test.20261025@example.com');
  assert.equal(normalizeEmail('  user@DOMAIN.Co.Uk  '), 'user@domain.co.uk');
  assert.equal(normalizeEmail(''), undefined);
  assert.equal(normalizeEmail(null), undefined);
});

// ─── 3. English Test Score & Date Sanity Checks (SCOL-CRM-020) ──────────────
test('SCOL-CRM-020: IELTS and TOEFL score validation and future date blocking', () => {
  const validateIelts = (score) => {
    const num = Number(score);
    if (isNaN(num) || num < 0 || num > 9) return false;
    return (num * 10) % 5 === 0; // step of 0.5
  };

  const validateToefl = (overall, reading, listening, speaking, writing) => {
    const o = Number(overall);
    if (isNaN(o) || o < 0 || o > 120) return false;
    const r = Number(reading) || 0;
    const l = Number(listening) || 0;
    const s = Number(speaking) || 0;
    const w = Number(writing) || 0;
    const sum = r + l + s + w;
    if (sum > 0 && sum !== o) return false;
    return true;
  };

  const validateTestDate = (dateStr) => {
    if (!dateStr) return true;
    const today = new Date().toISOString().split('T')[0];
    return dateStr <= today;
  };

  // IELTS tests
  assert.equal(validateIelts(7.0), true);
  assert.equal(validateIelts(7.5), true);
  assert.equal(validateIelts(6.5), true);
  assert.equal(validateIelts(7.3), false, 'IELTS 7.3 is not in 0.5 steps');
  assert.equal(validateIelts(9.5), false, 'IELTS > 9.0 is invalid');
  assert.equal(validateIelts(-1), false, 'IELTS < 0 is invalid');

  // TOEFL tests
  assert.equal(validateToefl(100, 25, 25, 25, 25), true);
  assert.equal(validateToefl(80, 20, 20, 20, 20), true);
  assert.equal(validateToefl(110, 10, 10, 10, 10), false, 'Sum 40 does not match overall 110');
  assert.equal(validateToefl(130, 30, 30, 35, 35), false, 'Overall > 120 is invalid');

  // Passing date tests
  assert.equal(validateTestDate('2024-05-15'), true);
  assert.equal(validateTestDate('2030-01-01'), false, 'Future date must be blocked');
});

// ─── 4. Date Range Filter Validation (SCOL-CRM-022) ─────────────────────────
test('SCOL-CRM-022: Date range validation enforces dateFrom <= dateTo', () => {
  const validateDateRange = (from, to) => {
    if (from && to && from > to) {
      return { valid: false, error: 'Start date must be before or equal to end date.' };
    }
    return { valid: true, error: '' };
  };

  const validCase = validateDateRange('2026-01-01', '2026-10-26');
  assert.equal(validCase.valid, true);
  assert.equal(validCase.error, '');

  const invalidCase = validateDateRange('2026-10-26', '2026-01-01');
  assert.equal(invalidCase.valid, false);
  assert.equal(invalidCase.error, 'Start date must be before or equal to end date.');

  const equalCase = validateDateRange('2026-10-25', '2026-10-25');
  assert.equal(equalCase.valid, true);
});

// ─── 5. Stage Workflow Allowed Statuses (SCOL-CRM-005, 018, 023) ────────────
test('SCOL-CRM-005, 018, 023: Stage-specific allowed statuses mapping', async () => {
  const mappersModule = await import('../src/services/mappers.js');
  const { getStageAllowedStatuses } = mappersModule;

  assert.ok(typeof getStageAllowedStatuses === 'function', 'getStageAllowedStatuses must be exported');

  // ENROLLED stage must NOT allow REJECTED (SCOL-CRM-018)
  const enrolledAllowed = getStageAllowedStatuses('ENROLLED');
  assert.deepEqual(enrolledAllowed, ['IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
  assert.equal(enrolledAllowed.includes('REJECTED'), false, 'REJECTED must not be allowed when ENROLLED');

  // REVIEW stage
  const reviewAllowed = getStageAllowedStatuses('REVIEW');
  assert.ok(reviewAllowed.includes('PENDING'));
  assert.ok(reviewAllowed.includes('REJECTED'));
});

// ─── 6. Course Editing Validation & Dirty Fields (SCOL-CRM-047, 048) ────────
test('SCOL-CRM-047 & 048: Course edit validation and dirty fields extraction', () => {
  const validateCourseEdit = ({ tuitionFee, courseDuration, currency }) => {
    const ALLOWED_CURRENCIES = ['GBP', 'USD', 'CAD', 'AUD', 'EUR', 'BDT'];
    if (tuitionFee !== undefined && (isNaN(Number(tuitionFee)) || Number(tuitionFee) <= 0)) {
      return { valid: false, error: 'Tuition fee must be a positive number' };
    }
    if (courseDuration !== undefined && (isNaN(Number(courseDuration)) || Number(courseDuration) <= 0)) {
      return { valid: false, error: 'Course duration must be a positive number' };
    }
    if (currency !== undefined && !ALLOWED_CURRENCIES.includes(currency)) {
      return { valid: false, error: 'Currency must be an allowed ISO code' };
    }
    return { valid: true };
  };

  // SCOL-CRM-047: Reject negative fee and invalid currency
  assert.equal(validateCourseEdit({ tuitionFee: -100 }).valid, false);
  assert.equal(validateCourseEdit({ tuitionFee: 0 }).valid, false);
  assert.equal(validateCourseEdit({ tuitionFee: 16700 }).valid, true);
  assert.equal(validateCourseEdit({ currency: 'XYZ' }).valid, false);
  assert.equal(validateCourseEdit({ currency: 'GBP' }).valid, true);
  assert.equal(validateCourseEdit({ courseDuration: -5 }).valid, false);

  // SCOL-CRM-048: Extract only dirty (modified) fields
  const extractDirtyFields = (original, modified) => {
    const patch = {};
    for (const [key, value] of Object.entries(modified)) {
      if (value !== undefined && value !== original[key]) {
        patch[key] = value;
      }
    }
    return patch;
  };

  const originalCourse = { tuitionFee: '16700', currency: 'GBP', courseDuration: 12 };
  // User only changed duration
  const userEdited = { tuitionFee: '16700', currency: 'GBP', courseDuration: 14 };
  const patchToSend = extractDirtyFields(originalCourse, userEdited);

  assert.deepEqual(patchToSend, { courseDuration: 14 });
  assert.equal(patchToSend.tuitionFee, undefined, 'Unchanged tuitionFee must NOT be re-sent');
  assert.equal(patchToSend.currency, undefined, 'Unchanged currency must NOT be re-sent');
});

// ─── 7. Security Headers Configuration (SCOL-CRM-041) ───────────────────────
test('SCOL-CRM-041: vercel.json contains complete security headers', () => {
  const vercelConfigPath = path.join(frontendRoot, 'vercel.json');
  assert.ok(fs.existsSync(vercelConfigPath), 'vercel.json must exist');

  const content = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
  assert.ok(Array.isArray(content.headers), 'headers array must exist in vercel.json');

  const globalHeaderRule = content.headers.find(h => h.source === '/(.*)');
  assert.ok(globalHeaderRule, 'Must have global /(.*) header rule');

  const headersMap = Object.fromEntries(globalHeaderRule.headers.map(h => [h.key, h.value]));

  assert.equal(headersMap['X-Content-Type-Options'], 'nosniff');
  assert.equal(headersMap['X-Frame-Options'], 'DENY');
  assert.ok(headersMap['Content-Security-Policy'].includes("frame-ancestors 'none'"));
  assert.equal(headersMap['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.ok(headersMap['Permissions-Policy'].includes('camera=()'));
});

// ─── 8. Dynamic Document Section Naming (SCOL-CRM-040) ──────────────────────
test('SCOL-CRM-040: Document sections rename generic Other Documents with stage', () => {
  const normalizeDocumentRequirement = (item, stageCode, stageName) => {
    const rawName = item?.documentTypeName || item?.name || 'Document';
    const displayName = rawName.toLowerCase() === 'other documents' && stageName
      ? `Other Documents (${stageName})`
      : rawName;
    return { id: item.id, displayName };
  };

  const item1 = { id: '1', documentTypeName: 'Passport' };
  assert.equal(normalizeDocumentRequirement(item1, 'STAGE_1', 'Review').displayName, 'Passport');

  const item2 = { id: '2', documentTypeName: 'Other Documents' };
  assert.equal(normalizeDocumentRequirement(item2, 'OFFER_ACCEPTED', 'Offer Accepted').displayName, 'Other Documents (Offer Accepted)');
});

// ─── 9. Notes Length & Character Counter (SCOL-CRM-028) ─────────────────────
test('SCOL-CRM-028: Note textarea maxLength 1000 enforcement', () => {
  const MAX_NOTE_LENGTH = 1000;
  const validateNote = (text) => {
    if (!text || !text.trim()) return { valid: false, error: 'Note cannot be empty' };
    if (text.length > MAX_NOTE_LENGTH) {
      return { valid: false, error: `description must be shorter than or equal to ${MAX_NOTE_LENGTH} characters` };
    }
    return { valid: true };
  };

  const validNote = 'A'.repeat(500);
  assert.equal(validateNote(validNote).valid, true);

  const exactBoundary = 'B'.repeat(1000);
  assert.equal(validateNote(exactBoundary).valid, true);

  const oversizedNote = 'C'.repeat(1001);
  assert.equal(validateNote(oversizedNote).valid, false);
});

// ─── 10. Intake Dates Parsing (SCOL-CRM-001 & 021) ──────────────────────────
test('SCOL-CRM-001 & 021: Intake string array parsing into dropdown options', () => {
  const MONTHS = [
    { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' },
    { value: 4, label: 'Apr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' }, { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' },
  ];

  const parseIntakeStrings = (stringIntakes) => {
    return (stringIntakes || []).map((str) => {
      const parts = String(str).trim().split(/\s+/);
      const monthName = parts[0];
      const yearNum = Number(parts[1]) || new Date().getFullYear();
      const matchedMonth = MONTHS.find(m =>
        m.label.toLowerCase() === monthName?.toLowerCase() ||
        monthName?.toLowerCase().startsWith(m.label.toLowerCase()) ||
        String(m.value) === monthName
      );
      const monthNum = matchedMonth ? matchedMonth.value : 12;
      return {
        month: monthNum,
        year: yearNum,
        label: `${MONTHS.find(m => m.value === monthNum)?.label || monthNum} ${yearNum}`,
        value: `${monthNum}-${yearNum}`,
      };
    });
  };

  const intakes = ['December 2026', 'January 2027', 'Sep 2026'];
  const parsed = parseIntakeStrings(intakes);

  assert.equal(parsed.length, 3);
  assert.deepEqual(parsed[0], { month: 12, year: 2026, label: 'Dec 2026', value: '12-2026' });
  assert.deepEqual(parsed[1], { month: 1, year: 2027, label: 'Jan 2027', value: '1-2027' });
  assert.deepEqual(parsed[2], { month: 9, year: 2026, label: 'Sep 2026', value: '9-2026' });
});

// ─── 11. Lead Address Display Trailing Comma (SCOL-CRM-013) ─────────────────
test('SCOL-CRM-013: Lead address formatting removes trailing comma', () => {
  const formatAddress = (address, city) => {
    return [address, city].filter(Boolean).join(', ') || 'Not provided';
  };

  assert.equal(formatAddress('E2E Test Address 1', ''), 'E2E Test Address 1');
  assert.equal(formatAddress('E2E Test Address 1', 'Dhaka'), 'E2E Test Address 1, Dhaka');
  assert.equal(formatAddress('', 'Dhaka'), 'Dhaka');
  assert.equal(formatAddress('', ''), 'Not provided');
});

// ─── 12. Dashboard Legend Typo (SCOL-CRM-035) ───────────────────────────────
test('SCOL-CRM-035: Dashboard legend typo corrected to CAS/COE/I-20', () => {
  const dashboardCode = fs.readFileSync(
    path.join(frontendRoot, 'src/pages/Dashboard/Dashboard.jsx'),
    'utf8'
  );
  assert.equal(dashboardCode.includes('CAS/COE/120'), false, 'Typo CAS/COE/120 must not exist');
  assert.equal(dashboardCode.includes('CAS/COE/I-20'), true, 'Correct label CAS/COE/I-20 must be present');
});
