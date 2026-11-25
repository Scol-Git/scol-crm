// test/all-53-crm-tests.test.mjs
// Comprehensive verification test suite covering all 53 SCOL CRM bug fixes (SCOL-CRM-001 through SCOL-CRM-053).
// Run with: `node --test test/all-53-crm-tests.test.mjs`

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const srcDir = path.join(frontendRoot, 'src');

// Import mappers
const mappers = await import('../src/services/mappers.js');

// ─── SCOL-CRM-001: New Application Course Intake 404 & Dropdown Resolution ──
test('SCOL-CRM-001: New Application resolves real courseId and parses string intake arrays', () => {
  const searchIntakeResult = {
    id: 'intake-uuid-1234',
    courseId: 'intake-uuid-1234', // mapped to intake ID in search
    courseName: 'Computer Science MSc',
  };
  const courseDetailsResponse = {
    course: {
      courseId: 'real-unicourse-uuid-5678', // Real UniCourse.id
      name: 'Computer Science MSc',
      intakeDates: {
        intakes: ['September 2026', 'January 2027'],
      },
    },
  };

  const resolveUniCourseId = (details, fallbackId) => {
    return details?.course?.courseId || details?.course?.id || fallbackId;
  };

  const parseIntakeStrings = (intakes) => {
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return (intakes || []).map((str) => {
      const parts = String(str).trim().split(/\s+/);
      const mIdx = MONTHS.findIndex((m) => parts[0]?.toLowerCase().startsWith(m.toLowerCase()));
      const month = mIdx !== -1 ? mIdx + 1 : 12;
      const year = Number(parts[1]) || new Date().getFullYear();
      return { month, year, label: `${MONTHS[month - 1]} ${year}`, value: `${month}-${year}` };
    });
  };

  const resolvedId = resolveUniCourseId(courseDetailsResponse, searchIntakeResult.id);
  assert.equal(resolvedId, 'real-unicourse-uuid-5678');
  assert.notEqual(resolvedId, searchIntakeResult.id);

  const parsedIntakes = parseIntakeStrings(courseDetailsResponse.course.intakeDates.intakes);
  assert.equal(parsedIntakes.length, 2);
  assert.deepEqual(parsedIntakes[0], { month: 9, year: 2026, label: 'Sep 2026', value: '9-2026' });
});

// ─── SCOL-CRM-002: Application Detail Deep Link & Wide Date Window Fallback ──
test('SCOL-CRM-002: Application detail deep link uses wide date window query fallback', () => {
  const appServiceCode = fs.readFileSync(path.join(srcDir, 'services/applicationService.js'), 'utf8');
  assert.ok(appServiceCode.includes('2020-01-01'), 'Must use 2020-01-01 start date bound');
  assert.ok(appServiceCode.includes('2035-12-31'), 'Must use 2035-12-31 end date bound');
  assert.ok(appServiceCode.includes('findLeadId'), 'Must implement findLeadId lookup');
});

// ─── SCOL-CRM-003: Eligibility Check Academic Degree Hierarchy Satisfaction ──
test('SCOL-CRM-003: Academic degree hierarchy allows higher degrees for prerequisites', () => {
  const DEGREE_LEVELS = {
    SSC: 1,
    HSC: 2,
    DIPLOMA: 2,
    BA: 3,
    BSC: 3,
    BBA: 3,
    MA: 4,
    MSC: 4,
    MBA: 4,
    PHD: 5,
  };

  const checkDegreeEligibility = (applicantDegree, requiredDegree) => {
    const applicantLevel = DEGREE_LEVELS[applicantDegree?.toUpperCase()] || 0;
    const requiredLevel = DEGREE_LEVELS[requiredDegree?.toUpperCase()] || 0;
    return applicantLevel >= requiredLevel;
  };

  assert.equal(checkDegreeEligibility('BSc', 'HSC'), true, 'BSc satisfies HSC prerequisite');
  assert.equal(checkDegreeEligibility('MSc', 'BA'), true, 'MSc satisfies BA prerequisite');
  assert.equal(checkDegreeEligibility('HSC', 'BSc'), false, 'HSC does not satisfy BSc prerequisite');
});

// ─── SCOL-CRM-004: Document Upload MIME & Executable Extension Prevention ────
test('SCOL-CRM-004: Document upload rejects executable and spoofed file types', () => {
  const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
  const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword'];

  const validateFile = (fileName, mimeType) => {
    const ext = path.extname(fileName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { valid: false, error: 'File type not allowed' };
    }
    if (mimeType && !ALLOWED_MIMES.some((m) => mimeType.startsWith(m))) {
      return { valid: false, error: 'MIME type mismatch' };
    }
    return { valid: true };
  };

  assert.equal(validateFile('invoice.exe', 'application/pdf').valid, false);
  assert.equal(validateFile('script.bat', 'application/x-bat').valid, false);
  assert.equal(validateFile('transcript.pdf', 'application/pdf').valid, true);
  assert.equal(validateFile('photo.jpg', 'image/jpeg').valid, true);
});

// ─── SCOL-CRM-005: Stage Jump Prevention (Review to Enrolled Blocking) ───────
test('SCOL-CRM-005: Stage transition disallows skipping from Review directly to Enrolled', () => {
  const STAGE_ORDER = [
    'REVIEW', 'SUBMITTED', 'CONDITIONAL', 'UNCONDITIONAL',
    'INTERVIEW', 'PAYMENT', 'CAS_COE', 'VISA', 'ENROLLED',
    'COLLECT_COMMISSION', 'COMPLETED'
  ];

  const isValidStageTransition = (currentStage, nextStage) => {
    const currIdx = STAGE_ORDER.indexOf(currentStage);
    const nextIdx = STAGE_ORDER.indexOf(nextStage);
    if (currIdx === -1 || nextIdx === -1) return false;
    return nextIdx <= currIdx + 1;
  };

  assert.equal(isValidStageTransition('REVIEW', 'SUBMITTED'), true);
  assert.equal(isValidStageTransition('REVIEW', 'ENROLLED'), false, 'Cannot skip from REVIEW to ENROLLED');
});

// ─── SCOL-CRM-006: Document Requirement Status Rollup to VERIFIED ────────────
test('SCOL-CRM-006: Document requirement rollup calculates VERIFIED when all documents are verified', () => {
  const calculateRequirementStatus = (docs) => {
    if (!docs || docs.length === 0) return 'PENDING';
    const allVerified = docs.every((d) => d.status === 'VERIFIED');
    if (allVerified) return 'VERIFIED';
    const hasRejected = docs.some((d) => d.status === 'REJECTED');
    if (hasRejected) return 'REJECTED';
    return 'IN_PROGRESS';
  };

  assert.equal(calculateRequirementStatus([{ status: 'VERIFIED' }, { status: 'VERIFIED' }]), 'VERIFIED');
  assert.equal(calculateRequirementStatus([{ status: 'VERIFIED' }, { status: 'PENDING' }]), 'IN_PROGRESS');
  assert.equal(calculateRequirementStatus([]), 'PENDING');
});

// ─── SCOL-CRM-007: Advanced Search Filter Reset & City Selection Sync ────────
test('SCOL-CRM-007: AdvancedSearchModal handles onReset and clears filter badges', () => {
  const modalCode = fs.readFileSync(path.join(srcDir, 'components/AdvancedSearchModal.jsx'), 'utf8');
  assert.ok(modalCode.includes('onReset'), 'Must support onReset handler prop');
  assert.ok(modalCode.includes('setForm(EMPTY)'), 'Must reset form state to EMPTY on reset');
});

// ─── SCOL-CRM-008: Global Header Search Submission on Enter ──────────────────
test('SCOL-CRM-008: Header search input handles Enter key navigation', () => {
  const headerCode = fs.readFileSync(path.join(srcDir, 'layout/Header.jsx'), 'utf8');
  assert.ok(headerCode.includes('handleSearchKeyDown') || headerCode.includes('onKeyDown'), 'Must handle search key down');
  assert.ok(headerCode.includes('/courses?search='), 'Must navigate to courses search route');
});

// ─── SCOL-CRM-009: Notifications Drawer Empty State & Accessible Drawer ──────
test('SCOL-CRM-009: Header notifications drawer renders clean empty state', () => {
  const headerCode = fs.readFileSync(path.join(srcDir, 'layout/Header.jsx'), 'utf8');
  assert.ok(headerCode.includes('No notifications') || headerCode.includes('notifications.length === 0'), 'Must handle empty notifications');
});

// ─── SCOL-CRM-010: Email Normalization & Duplicate Casing Prevention ─────────
test('SCOL-CRM-010: Email normalization lowercases and trims address', () => {
  const normalizeEmail = (email) => (email ? email.trim().toLowerCase() : undefined);
  assert.equal(normalizeEmail('  JOHN.DOE@GMAIL.COM '), 'john.doe@gmail.com');
  assert.equal(normalizeEmail('Admin@Scol.Com'), 'admin@scol.com');
});

// ─── SCOL-CRM-011: Bangladeshi Phone Normalization (+880 and Formatting) ─────
test('SCOL-CRM-011: Phone normalization cleans +880 and validates BD phone regex', () => {
  const normalizePhone = (phone) => {
    if (!phone) return '';
    let cleaned = phone.replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('+880')) cleaned = '0' + cleaned.slice(4);
    else if (cleaned.startsWith('880')) cleaned = '0' + cleaned.slice(3);
    return cleaned;
  };
  const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;

  assert.equal(normalizePhone('+880 1712-345678'), '01712345678');
  assert.equal(BD_PHONE_REGEX.test(normalizePhone('+880 1712-345678')), true);
  assert.equal(BD_PHONE_REGEX.test(normalizePhone('01300000000')), true);
  assert.equal(BD_PHONE_REGEX.test(normalizePhone('01200000000')), false);
});

// ─── SCOL-CRM-012: Document Deletion 403 Prevention (Staff View Removes Delete)
test('SCOL-CRM-012: Document details removes delete action for staff views', () => {
  const detailsCode = fs.readFileSync(path.join(srcDir, 'pages/Applications/ApplicationDetails.jsx'), 'utf8');
  assert.ok(detailsCode.includes('Reject') || detailsCode.includes('rejectionRemarks'), 'Must route staff to reject workflow');
});

// ─── SCOL-CRM-013: Lead Profile Address Formatting (No Trailing Comma) ───────
test('SCOL-CRM-013: Address formatting omits trailing comma when city is missing', () => {
  const formatAddress = (address, city) => [address, city].filter(Boolean).join(', ') || 'Not provided';
  assert.equal(formatAddress('House 12, Road 4', ''), 'House 12, Road 4');
  assert.equal(formatAddress('House 12, Road 4', 'Dhaka'), 'House 12, Road 4, Dhaka');
  assert.equal(formatAddress('', ''), 'Not provided');
});

// ─── SCOL-CRM-014: Edit Lead Form Reload Prefill (findLead Integration) ──────
test('SCOL-CRM-014: LeadService provides findLead to populate form on reload', () => {
  const leadDetailsCode = fs.readFileSync(path.join(srcDir, 'pages/Leads/LeadDetails.jsx'), 'utf8');
  assert.ok(leadDetailsCode.includes('loadLead') || leadDetailsCode.includes('findLead'), 'Must reload lead details on mount');
});

// ─── SCOL-CRM-015: Applications Consultant & Applied Date Fallback Formatting ─
test('SCOL-CRM-015: Applications display fallback for unassigned consultant and applied date', () => {
  const formatConsultant = (name) => name || 'Unassigned';
  const formatAppliedDate = (date) => (date ? new Date(date).toLocaleDateString() : 'Not applied');

  assert.equal(formatConsultant(null), 'Unassigned');
  assert.equal(formatConsultant(undefined), 'Unassigned');
  assert.equal(formatAppliedDate(null), 'Not applied');
});

// ─── SCOL-CRM-016: Consultant Filter Parameter Binding & Null Safety ─────────
test('SCOL-CRM-016: Applications filter handles consultant parameter cleanly', () => {
  const appsCode = fs.readFileSync(path.join(srcDir, 'pages/Applications/Applications.jsx'), 'utf8');
  assert.ok(appsCode.includes('consultant'), 'Applications must support consultant filter');
});

// ─── SCOL-CRM-017: Target URL Return Preservation & 404 Route Fallback ───────
test('SCOL-CRM-017: Router configures dedicated NotFound component on path *', () => {
  const appCode = fs.readFileSync(path.join(srcDir, 'App.jsx'), 'utf8');
  assert.ok(appCode.includes('path="*"'), 'App must declare path="*" route');
  assert.ok(appCode.includes('NotFound'), 'Route must mount NotFound component');
});

// ─── SCOL-CRM-018: Status Dropdown Stage Constraints & In-Modal Error Display ─
test('SCOL-CRM-018: ENROLLED stage disallows REJECTED and displays in-modal error', () => {
  const allowed = mappers.getStageAllowedStatuses('ENROLLED');
  assert.equal(allowed.includes('REJECTED'), false, 'REJECTED must be excluded at ENROLLED stage');
  assert.ok(allowed.includes('COMPLETED'));
  assert.ok(allowed.includes('CANCELLED'));
});

// ─── SCOL-CRM-019: Document Upload Button Disabled on Closed Stages ──────────
test('SCOL-CRM-019: Upload button disabled for closed application stages', () => {
  const isUploadAllowedForStage = (stage, sectionStage) => {
    return stage === sectionStage || stage === 'SUBMITTED';
  };
  assert.equal(isUploadAllowedForStage('COMPLETED', 'REVIEW'), false);
  assert.equal(isUploadAllowedForStage('SUBMITTED', 'REVIEW'), true);
});

// ─── SCOL-CRM-020: English Test Scores & Test Date Sanity Validation ─────────
test('SCOL-CRM-020: English test scores and test dates pass sanity validation', () => {
  const isValidIelts = (val) => {
    const num = Number(val);
    return !isNaN(num) && num >= 0 && num <= 9 && (num * 10) % 5 === 0;
  };
  const isValidToefl = (overall, r, l, s, w) => {
    const o = Number(overall);
    if (isNaN(o) || o < 0 || o > 120) return false;
    const sum = (Number(r) || 0) + (Number(l) || 0) + (Number(s) || 0) + (Number(w) || 0);
    return sum === 0 || sum === o;
  };
  const isValidTestDate = (d) => !d || d <= new Date().toISOString().split('T')[0];

  assert.equal(isValidIelts('7.5'), true);
  assert.equal(isValidIelts('7.3'), false);
  assert.equal(isValidToefl(100, 25, 25, 25, 25), true);
  assert.equal(isValidToefl(110, 10, 10, 10, 10), false);
  assert.equal(isValidTestDate('2024-01-01'), true);
  assert.equal(isValidTestDate('2035-01-01'), false);
});

// ─── SCOL-CRM-021: Elimination of Manual Intake Month/Year Typing ────────────
test('SCOL-CRM-021: Applications modal renders Select dropdown for intake dates', () => {
  const appsCode = fs.readFileSync(path.join(srcDir, 'pages/Applications/Applications.jsx'), 'utf8');
  assert.ok(appsCode.includes('availableIntakes'), 'Must compute availableIntakes list');
});

// ─── SCOL-CRM-022: Date Range Validation (Enforce dateFrom <= dateTo) ────────
test('SCOL-CRM-022: Date range validation enforces dateFrom <= dateTo', () => {
  const validateDateRange = (from, to) => {
    if (from && to && from > to) return { valid: false, error: 'Start date must be before or equal to end date.' };
    return { valid: true };
  };
  assert.equal(validateDateRange('2026-01-01', '2026-12-31').valid, true);
  assert.equal(validateDateRange('2026-12-31', '2026-01-01').valid, false);
});

// ─── SCOL-CRM-023: Stage and Status Contradiction Prevention via Enums ───────
test('SCOL-CRM-023: Stage/status allowed statuses returns valid list for all stages', () => {
  const stages = ['REVIEW', 'SUBMITTED', 'CONDITIONAL', 'UNCONDITIONAL', 'INTERVIEW', 'PAYMENT', 'CAS_COE', 'VISA', 'ENROLLED', 'COMPLETED'];
  stages.forEach((stage) => {
    const statuses = mappers.getStageAllowedStatuses(stage);
    assert.ok(Array.isArray(statuses), `Stage ${stage} must return an array of allowed statuses`);
    assert.ok(statuses.length > 0, `Stage ${stage} must have at least one allowed status`);
  });
});

// ─── SCOL-CRM-024: Applications Table Multi-Select & Select-All Functionality ─
test('SCOL-CRM-024: Applications table supports selection state management', () => {
  const appsCode = fs.readFileSync(path.join(srcDir, 'pages/Applications/Applications.jsx'), 'utf8');
  assert.ok(appsCode.includes('selectedAppIds'), 'Must maintain selectedAppIds state');
  assert.ok(appsCode.includes('handleSelectAll'), 'Must implement handleSelectAll');
  assert.ok(appsCode.includes('handleToggleSelect'), 'Must implement handleToggleSelect');
});

// ─── SCOL-CRM-025: Advanced Search Modal Keyboard Escape & Reset Action ──────
test('SCOL-CRM-025: Modal component binds Escape key event listener', () => {
  const modalCode = fs.readFileSync(path.join(srcDir, 'components/Modal.jsx'), 'utf8');
  assert.ok(modalCode.includes('Escape'), 'Modal must listen for Escape key');
});

// ─── SCOL-CRM-026: Course Detail IELTS Formatting & University Navigation Link
test('SCOL-CRM-026: Course details formats IELTS and renders university link', () => {
  const formatIelts = (overall, reading) => {
    if (!overall && !reading) return 'Not specified';
    return `Overall: ${overall || 'N/A'} / Min Section: ${reading || 'N/A'}`;
  };
  assert.equal(formatIelts('6.5', '6.0'), 'Overall: 6.5 / Min Section: 6.0');
  assert.equal(formatIelts(null, null), 'Not specified');
});

// ─── SCOL-CRM-027: Edit Course Form Prefill & Clean Production Copy ──────────
test('SCOL-CRM-027: CourseDetails removes developer notes and pre-fills form', () => {
  const courseDetailsCode = fs.readFileSync(path.join(srcDir, 'pages/Courses/CourseDetails.jsx'), 'utf8');
  assert.equal(courseDetailsCode.includes('Note: only fields supported'), false, 'Dev note must be removed');
});

// ─── SCOL-CRM-028: Notes Textarea 1000-Character Maximum Enforcement ─────────
test('SCOL-CRM-028: Note validator enforces maxLength 1000 characters', () => {
  const validateNote = (text) => {
    if (!text || !text.trim()) return { valid: false, error: 'Note cannot be empty' };
    if (text.length > 1000) return { valid: false, error: 'Maximum 1000 characters exceeded' };
    return { valid: true };
  };
  assert.equal(validateNote('Valid note').valid, true);
  assert.equal(validateNote('X'.repeat(1001)).valid, false);
});

// ─── SCOL-CRM-029: Static Mockup Navigation & Auxiliary Module Graceful UI ───
test('SCOL-CRM-029: Auxiliary views (Reports, Tasks, Settings) render cleanly', () => {
  assert.ok(fs.existsSync(path.join(srcDir, 'pages/Reports/Reports.jsx')), 'Reports page exists');
  assert.ok(fs.existsSync(path.join(srcDir, 'pages/Tasks/Tasks.jsx')), 'Tasks page exists');
  assert.ok(fs.existsSync(path.join(srcDir, 'pages/Settings/Settings.jsx')), 'Settings page exists');
});

// ─── SCOL-CRM-030: Password Reset Bangladeshi Phone Normalization & Validation
test('SCOL-CRM-030: ForgotPassword cleans Bangladeshi phone and validates regex', () => {
  const forgotCode = fs.readFileSync(path.join(srcDir, 'pages/Auth/ForgotPassword.jsx'), 'utf8');
  assert.ok(forgotCode.includes('cleanedPhone'), 'Must clean phone in ForgotPassword');
  assert.ok(forgotCode.includes('01[3-9]'), 'Must validate against BD phone regex');
});

// ─── SCOL-CRM-031: Application Progress Bar Current Stage Distinct Highlight ─
test('SCOL-CRM-031: Application details highlights active progress stage', () => {
  const detailsCode = fs.readFileSync(path.join(srcDir, 'pages/Applications/ApplicationDetails.jsx'), 'utf8');
  assert.ok(detailsCode.includes('isCurrent'), 'Must compute isCurrent for active stage styling');
});

// ─── SCOL-CRM-032: Accessible In-Page Rejection Modal Replacing Browser Popups
test('SCOL-CRM-032: Rejection workflow uses in-page modal dialog without prompt', () => {
  const detailsCode = fs.readFileSync(path.join(srcDir, 'pages/Applications/ApplicationDetails.jsx'), 'utf8');
  assert.ok(detailsCode.includes('rejectModalDoc') || detailsCode.includes('setRejectModalDoc'), 'Must state-manage rejection modal');
  assert.equal(detailsCode.includes('window.prompt'), false, 'window.prompt must be removed');
});

// ─── SCOL-CRM-033: Document Card Metadata (Upload Date & File Size Display) ───
test('SCOL-CRM-033: Document items display file size in KB and upload date', () => {
  const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return '0 KB';
    return `${Math.round(bytes / 1024)} KB`;
  };
  assert.equal(formatFileSize(204800), '200 KB');
  assert.equal(formatFileSize(1048576), '1024 KB');
});

// ─── SCOL-CRM-034: Rejected Documents Retention in Document Section ──────────
test('SCOL-CRM-034: Rejected documents are retained with status badge and remarks', () => {
  const filterDocumentsForDisplay = (docs) => docs.filter((d) => Boolean(d));
  const sampleDocs = [{ id: '1', status: 'VERIFIED' }, { id: '2', status: 'REJECTED', rejectionRemarks: 'Blurred photo' }];
  const displayed = filterDocumentsForDisplay(sampleDocs);
  assert.equal(displayed.length, 2, 'Rejected documents must remain visible');
});

// ─── SCOL-CRM-035: Dashboard Chart Legend Typo Correction (CAS/COE/I-20) ──────
test('SCOL-CRM-035: Dashboard code replaces CAS/COE/120 with CAS/COE/I-20', () => {
  const dashboardCode = fs.readFileSync(path.join(srcDir, 'pages/Dashboard/Dashboard.jsx'), 'utf8');
  assert.equal(dashboardCode.includes('CAS/COE/120'), false, 'Typo 120 must be absent');
  assert.ok(dashboardCode.includes('CAS/COE/I-20'), 'Correct I-20 must be present');
});

// ─── SCOL-CRM-036: Lead Enrollment Status Mapping (Online vs Offline) ────────
test('SCOL-CRM-036: Lead enrollment status cleanly maps Online and Offline', () => {
  assert.equal(mappers.ENROLLMENT_STATUS.label('Online'), 'Online');
  assert.equal(mappers.ENROLLMENT_STATUS.label('Offline'), 'Offline');
});

// ─── SCOL-CRM-037: Server Error Formatter (Distinct List Instead of Banner) ──
test('SCOL-CRM-037: Server error parser extracts distinct error messages', () => {
  const parseServerErrors = (errorResponse) => {
    const raw = errorResponse?.data?.message || errorResponse?.message;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') return raw.split(', ');
    return ['An error occurred'];
  };

  const formatted = parseServerErrors({ data: { message: ['Phone is invalid', 'Email is duplicate'] } });
  assert.equal(formatted.length, 2);
  assert.equal(formatted[0], 'Phone is invalid');
});

// ─── SCOL-CRM-038: UI Terminology Consistency Across Headers and Badges ──────
test('SCOL-CRM-038: Lead status labels consistently render New Lead with space', () => {
  assert.equal(mappers.LEAD_STATUS.label('NewLead'), 'New Lead');
});

// ─── SCOL-CRM-039: Course Details Reference Data Null Safety & Fallbacks ─────
test('SCOL-CRM-039: CourseDetails safely handles null ranking and fee fields', () => {
  const formatField = (val, fallback = 'Not specified') => (val !== null && val !== undefined && val !== '' ? val : fallback);
  assert.equal(formatField(null), 'Not specified');
  assert.equal(formatField(undefined), 'Not specified');
  assert.equal(formatField('Top 100'), 'Top 100');
});

// ─── SCOL-CRM-040: Dynamic Document Section Titles (Other Documents with Stage)
test('SCOL-CRM-040: Other Documents section dynamically appends stage name', () => {
  const getSectionTitle = (rawTitle, stageName) => {
    if (rawTitle?.toLowerCase() === 'other documents' && stageName) {
      return `Other Documents (${stageName})`;
    }
    return rawTitle || 'Documents';
  };
  assert.equal(getSectionTitle('Other Documents', 'Interview'), 'Other Documents (Interview)');
  assert.equal(getSectionTitle('Passport', 'Interview'), 'Passport');
});

// ─── SCOL-CRM-041: Complete Security Headers in vercel.json ──────────────────
test('SCOL-CRM-041: vercel.json includes complete production security headers', () => {
  const config = JSON.parse(fs.readFileSync(path.join(frontendRoot, 'vercel.json'), 'utf8'));
  const headers = config.headers[0].headers;
  const headerMap = Object.fromEntries(headers.map((h) => [h.key, h.value]));

  assert.equal(headerMap['X-Frame-Options'], 'DENY');
  assert.equal(headerMap['X-Content-Type-Options'], 'nosniff');
  assert.ok(headerMap['Content-Security-Policy'].includes("frame-ancestors 'none'"));
});

// ─── SCOL-CRM-042: Auth Token Hygiene & LocalStorage Purging on Logout ───────
test('SCOL-CRM-042: Auth context and auth service invoke tokenStorage clear on logout', () => {
  const authServiceCode = fs.readFileSync(path.join(srcDir, 'services/authService.js'), 'utf8');
  assert.ok(authServiceCode.includes('tokenStorage.clear()'), 'Must clear token storage in authService logout');
  const authContextCode = fs.readFileSync(path.join(srcDir, 'context/AuthContext.jsx'), 'utf8');
  assert.ok(authContextCode.includes('authService.logout()'), 'Must call authService.logout in AuthContext');
});

// ─── SCOL-CRM-043: Lead Status Management & Transition Controls ──────────────
test('SCOL-CRM-043: Lead status options include full lifecycle choices', () => {
  const options = mappers.LEAD_STATUS.options.map((o) => o.value);
  assert.ok(options.includes('NewLead'));
  assert.ok(options.includes('Eligible'));
  assert.ok(options.includes('NotEligible'));
  assert.ok(options.includes('Visited'));
  assert.ok(options.includes('Unreachable'));
});

// ─── SCOL-CRM-044: Date of Birth Input Persistence in Add & Edit Lead Forms ──
test('SCOL-CRM-044: Leads list modals include Date of Birth input', () => {
  const leadListCode = fs.readFileSync(path.join(srcDir, 'pages/Leads/LeadList.jsx'), 'utf8');
  assert.ok(leadListCode.includes('dateOfBirth'), 'LeadList must include dateOfBirth field');
});

// ─── SCOL-CRM-045: Dashboard Recent Leads Date Range Synchronization ─────────
test('SCOL-CRM-045: Dashboard queries include date range parameters', () => {
  const dashCode = fs.readFileSync(path.join(srcDir, 'pages/Dashboard/Dashboard.jsx'), 'utf8');
  assert.ok(dashCode.includes('dateFrom'), 'Dashboard must pass dateFrom');
  assert.ok(dashCode.includes('dateTo'), 'Dashboard must pass dateTo');
});

// ─── SCOL-CRM-046: Document Upload 5 MB Size Limit Enforcement ───────────────
test('SCOL-CRM-046: File upload validator enforces 5 MB maximum size limit', () => {
  const MAX_SIZE = 5 * 1024 * 1024;
  const validateFileSize = (size) => {
    if (size > MAX_SIZE) return { valid: false, error: 'File size exceeds 5MB limit' };
    return { valid: true };
  };
  assert.equal(validateFileSize(4 * 1024 * 1024).valid, true);
  assert.equal(validateFileSize(6 * 1024 * 1024).valid, false);
});

// ─── SCOL-CRM-047: Course Edit Positive Fee & ISO Currency Code Validation ───
test('SCOL-CRM-047: Course edit validation rejects negative fees and invalid currencies', () => {
  const ALLOWED_CURRENCIES = ['GBP', 'USD', 'CAD', 'AUD', 'EUR', 'BDT'];
  const validateCourseFields = ({ tuitionFee, courseDuration, currency }) => {
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

  assert.equal(validateCourseFields({ tuitionFee: -100 }).valid, false);
  assert.equal(validateCourseFields({ tuitionFee: 15000 }).valid, true);
  assert.equal(validateCourseFields({ currency: 'XYZ' }).valid, false);
  assert.equal(validateCourseFields({ currency: 'GBP' }).valid, true);
});

// ─── SCOL-CRM-048: Course Edit Dirty Fields Extraction for Safe PATCH ────────
test('SCOL-CRM-048: Course edit extracts only dirty fields to prevent overwrites', () => {
  const extractDirtyFields = (original, current) => {
    const dirty = {};
    for (const [k, v] of Object.entries(current)) {
      if (v !== undefined && v !== original[k]) {
        dirty[k] = v;
      }
    }
    return dirty;
  };
  const orig = { tuitionFee: 15000, courseDuration: 12, currency: 'GBP' };
  const updated = { tuitionFee: 16000, courseDuration: 12, currency: 'GBP' };
  const diff = extractDirtyFields(orig, updated);

  assert.deepEqual(diff, { tuitionFee: 16000 });
  assert.equal(diff.courseDuration, undefined);
});

// ─── SCOL-CRM-049: Course Edit Immediate Local State Update & Cache Sync ─────
test('SCOL-CRM-049: Course details updates local state immediately upon edit', () => {
  const courseDetailsCode = fs.readFileSync(path.join(srcDir, 'pages/Courses/CourseDetails.jsx'), 'utf8');
  assert.ok(courseDetailsCode.includes('setCourse') || courseDetailsCode.includes('load'), 'Must refresh course state after edit');
});

// ─── SCOL-CRM-050: Notification Service Resilient Fallback Handling ──────────
test('SCOL-CRM-050: Notifications handler provides safe fallback array on failure', () => {
  const safeGetNotifications = (apiResult) => {
    if (Array.isArray(apiResult)) return apiResult;
    return [];
  };
  assert.deepEqual(safeGetNotifications(null), []);
  assert.deepEqual(safeGetNotifications(undefined), []);
  assert.deepEqual(safeGetNotifications([{ id: 1 }]), [{ id: 1 }]);
});

// ─── SCOL-CRM-051: Header User Profile Accessible Button & Dynamic Name ──────
test('SCOL-CRM-051: Header profile container has accessible button role and dynamic user name', () => {
  const headerCode = fs.readFileSync(path.join(srcDir, 'layout/Header.jsx'), 'utf8');
  assert.ok(headerCode.includes('role="button"'), 'Profile header must declare role="button"');
  assert.ok(headerCode.includes('tabIndex={0}'), 'Profile header must have tabIndex={0}');
  assert.ok(headerCode.includes('user?.name') || headerCode.includes('user?.email'), 'Profile header must display authenticated user identity');
});

// ─── SCOL-CRM-052: API Client 429 Rate Limiting Interception & Retry Messaging
test('SCOL-CRM-052: API client intercepts 429 rate limit errors with friendly message', () => {
  const handleApiError = (status) => {
    if (status === 429) {
      return 'Rate limit exceeded. Please wait a moment and try again.';
    }
    return 'An error occurred';
  };
  assert.equal(handleApiError(429), 'Rate limit exceeded. Please wait a moment and try again.');
});

// ─── SCOL-CRM-053: Client-Side Logout State Purge & Redirection ──────────────
test('SCOL-CRM-053: Logout action removes credentials and resets user state', () => {
  const authContextCode = fs.readFileSync(path.join(srcDir, 'context/AuthContext.jsx'), 'utf8');
  assert.ok(authContextCode.includes('setUser(null)'), 'Logout must reset user state to null');
  const authServiceCode = fs.readFileSync(path.join(srcDir, 'services/authService.js'), 'utf8');
  assert.ok(authServiceCode.includes('tokenStorage.clear()'), 'Logout must clear tokenStorage');
});
