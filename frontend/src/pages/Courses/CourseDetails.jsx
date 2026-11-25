import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Info, MapPin, ExternalLink, PlayCircle, Trash2 } from 'lucide-react';
import { Card, Button, Badge, Modal, Input, Select, Alert, DraftBadge, ConfirmDialog } from '../../components';
import { useAuth, useToast } from '../../context';
import { courseService } from '../../services/courseService';
import { crmUniversityService } from '../../services/crmUniversityService';
import { splitFieldErrors } from '../../utils/formErrors';
import { backLabelFor } from '../../utils/format';
import { colors } from '../../theme';

// Renders the tabbed course profile using the live CourseDetailsResponseDto.
// The `tabs` array comes from the backend, so the tab set adapts if it changes.
//
// Draft/publish: the response's `publish` block says whether this intake, its
// course and its university are live. A draft intake can be deleted by an
// ADMIN; there is no per-course publish (courses go live with their import).
// Counsellors get a 404 for drafts, which lands on the "not found" view below.
// Edit / delete are shown to ADMIN only.

// The edit form's fields; also the names PATCH validation errors are keyed by.
const EDIT_FIELDS = ['courseName', 'sysProgrammeId', 'tuitionFee', 'currency', 'courseDuration', 'applicationDeadline', 'externalUrl'];

// The Academic Info and Fees & Scholarships tabs each have their own editor.
// Both save through the same PATCH; these are the request fields each owns.
const ENGLISH_FIELDS = [
  'ieltsMinOverall', 'ieltsMinSection',
  'pteMinOverall', 'pteMinSection',
  'toeflMinOverall', 'toeflMinSection',
];
const SECTION_FIELDS = {
  academic: ['minSysDegreeId', 'minGpa', 'higherSysDegreeId', 'higherGpa', ...ENGLISH_FIELDS],
  fees: [
    'tuitionFee', 'currency', 'initialDeposit', 'applicationFee',
    'scholarshipName', 'scholarshipType', 'scholarshipAmount', 'scholarshipMetaData',
  ],
};
const SECTION_TITLES = {
  academic: 'Edit Academic Requirements',
  fees: 'Edit Fees & Scholarships',
};

const ENGLISH_TESTS = [
  { name: 'IELTS', overall: 'ieltsMinOverall', section: 'ieltsMinSection' },
  { name: 'PTE', overall: 'pteMinOverall', section: 'pteMinSection' },
  { name: 'TOEFL', overall: 'toeflMinOverall', section: 'toeflMinSection', max: 6 },
];

// Stored as decimal(10,2).
const MONEY_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;
// Up to 2 decimal places. The maximum is the selected degree's gpaScale.
const GPA_PATTERN = /^\d{1,2}(\.\d{1,2})?$/;
const formatGpaScale = (scale) => (
  scale == null || Number.isNaN(Number(scale)) ? '—' : Number(scale).toFixed(2)
);
const SCORE_PATTERN = /^\d{1,3}(\.\d{1,2})?$/;

// "19220" and "19220.00" are the same amount, so not a change worth sending.
const sameNumber = (a, b) => a !== '' && b !== '' && Number(a) === Number(b);

const engByName = (course) => {
  const map = {};
  for (const t of course?.academicRequirements?.requirements?.englishRequirements ?? []) {
    map[String(t.testName ?? '').toUpperCase()] = t;
  }
  return map;
};

// Prefills from CRM `edit` degree ids + displayed GPA/English rows.
const readAcademic = (course, edit = {}) => {
  const rows = course?.academicRequirements?.requirements?.degreeRequirements ?? [];
  const eng = engByName(course);
  const byIdGpa = {};
  // Display rows only exist when both degree and GPA are set; match by order
  // when we also have ids from `edit`.
  if (edit.minSysDegreeId && rows[0]) byIdGpa[edit.minSysDegreeId] = String(rows[0].minValue ?? '');
  if (edit.higherSysDegreeId && rows.length >= 2) {
    byIdGpa[edit.higherSysDegreeId] = String(rows[1].minValue ?? '');
  } else if (edit.higherSysDegreeId && rows.length === 1 && !edit.minSysDegreeId) {
    byIdGpa[edit.higherSysDegreeId] = String(rows[0].minValue ?? '');
  }

  const form = {
    minSysDegreeId: edit.minSysDegreeId ?? '',
    higherSysDegreeId: edit.higherSysDegreeId ?? '',
    minGpa: edit.minSysDegreeId ? (byIdGpa[edit.minSysDegreeId] ?? '') : '',
    higherGpa: edit.higherSysDegreeId ? (byIdGpa[edit.higherSysDegreeId] ?? '') : '',
  };

  // If ids are missing but two display rows exist, fall back to order.
  if (!edit.minSysDegreeId && !edit.higherSysDegreeId && rows.length === 2) {
    form.minGpa = String(rows[0].minValue ?? '');
    form.higherGpa = String(rows[1].minValue ?? '');
  }

  for (const t of ENGLISH_TESTS) {
    const row = eng[t.name] ?? {};
    form[t.overall] = String(row.minOverallValue ?? '');
    form[t.section] = String(row.minSectionValue ?? '');
  }
  return form;
};

const cleanMetaBlocks = (blocks) => (blocks ?? [])
  .map((b) => ({
    subtitle: (b.subtitle ?? '').trim(),
    description: (b.description ?? []).map((d) => String(d).trim()).filter(Boolean),
  }))
  .filter((b) => b.subtitle || b.description.length);

const metaBlocksFrom = (value) => (Array.isArray(value) ? value : []).map((b) => ({
  subtitle: b.subtitle ?? '',
  description: (b.description ?? []).length ? [...b.description] : [''],
}));

// Available is derived from metadata. null, [], and {} are Not available.
const scholarshipBadge = (blocks) => (cleanMetaBlocks(blocks).length > 0 ? 'Available' : 'Not available');

const isDmyDate = (raw) => {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(raw);
  if (!match) return false;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

// The currency is only returned together with a tuition fee.
const readFees = (course, edit = {}) => {
  const items = course?.feesAndScholarships?.items ?? {};
  return {
    tuitionFee: String(items.tuitionFees?.amount ?? ''),
    currency: String(items.tuitionFees?.currency ?? ''),
    initialDeposit: String(items.initialDeposit ?? ''),
    applicationFee: String(items.applicationFee ?? ''),
    scholarshipName: edit.scholarshipName ?? '',
    scholarshipType: edit.scholarshipType ?? '',
    scholarshipAmount: edit.scholarshipAmount != null ? String(edit.scholarshipAmount) : '',
    scholarshipMeta: metaBlocksFrom(edit.scholarshipMetaData),
  };
};

const storedMeta = (blocks) => {
  const cleaned = cleanMetaBlocks(blocks);
  return cleaned.length ? cleaned : null;
};

const MetaBlockList = ({ blocks, onChange }) => {
  const update = (index, patch) => onChange(blocks.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  // const add = () => onChange([...blocks, { subtitle: '', description: [''] }]);
  // const remove = (index) => onChange(blocks.filter((_, i) => i !== index));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {blocks.map((block, i) => (
        <div key={i} style={{ border: `1px solid ${colors.borderLight}`, borderRadius: '8px', padding: '12px' }}>
          {/* <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="small" icon={Trash2} onClick={() => remove(i)} aria-label="Remove block" />
          </div> */}
          <Input
            label="Subtitle"
            value={block.subtitle}
            onChange={(e) => update(i, { subtitle: e.target.value })}
          />
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: colors.textSecondary }}>
            Description (one line per paragraph)
          </label>
          <textarea
            value={(block.description ?? []).join('\n')}
            onChange={(e) => update(i, { description: e.target.value.split('\n') })}
            style={{
              width: '100%', minHeight: '80px', padding: '8px 10px', borderRadius: '6px',
              border: `1px solid ${colors.borderLight}`, fontSize: '13px', fontFamily: 'inherit',
              resize: 'vertical', boxSizing: 'border-box',
            }}
          />
        </div>
      ))}
      {/* <Button variant="ghost" size="small" icon={Plus} onClick={add}>Add block</Button> */}
    </div>
  );
};

const InfoDot = ({ meta, onOpen }) => {
  if (!meta) return null;
  return (
    <button
      type="button"
      onClick={() => onOpen(meta)}
      title={meta.title}
      aria-label={`More about ${meta.title}`}
      style={{
        border: 'none', background: 'transparent', cursor: 'pointer',
        color: colors.brandPrimary, padding: 0, lineHeight: 0, marginLeft: '6px',
      }}
    >
      <Info size={14} />
    </button>
  );
};

const Row = ({ label, value }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    gap: '16px', padding: '10px 0', borderBottom: `1px solid ${colors.borderLight}`,
  }}>
    <span style={{ fontSize: '13px', color: colors.textSecondary }}>{label}</span>
    <span style={{ fontSize: '14px', fontWeight: '500', color: colors.textPrimary, textAlign: 'right' }}>
      {value ?? 'N/A'}
    </span>
  </div>
);

const SectionTitle = ({ children, meta, onOpenMeta, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', margin: '0 0 12px' }}>
    <h3 style={{ display: 'flex', alignItems: 'center', margin: 0, fontSize: '16px', color: colors.textPrimary }}>
      {children}
      <InfoDot meta={meta} onOpen={onOpenMeta} />
    </h3>
    {action}
  </div>
);

const youTubeId = (url = '') => {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  return m ? m[1] : null;
};

const CourseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const toast = useToast();

  // The search (with its filters) the user came from, when there was one.
  const backTo = typeof location.state?.from === 'string' ? location.state.from : '/courses';

  const [course, setCourse] = useState(null);
  // { intakeIsPublished, courseIsPublished, universityIsPublished, importBatchId }
  const [publish, setPublish] = useState(null);
  // CRM-only editor values: degree ids, course URL, duration, scholarship set, metadata.
  const [editIds, setEditIds] = useState({});
  const [degreeOptions, setDegreeOptions] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(null);
  const [openMeta, setOpenMeta] = useState(null);
  const [metaEditing, setMetaEditing] = useState(false);
  const [metaDraft, setMetaDraft] = useState([]);
  const [feesMetaDraft, setFeesMetaDraft] = useState([]);
  const [scholarshipMetaDraft, setScholarshipMetaDraft] = useState([]);
  const [metaSaving, setMetaSaving] = useState(false);
  const [metaSaveError, setMetaSaveError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Course edit persists via PATCH /crm/courses/{courseId} (ADMIN only).
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    courseName: '', sysProgrammeId: '', tuitionFee: '', currency: '', courseDuration: '', applicationDeadline: '', externalUrl: '',
  });
  const [programmeOptions, setProgrammeOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  // Validation errors from a failed PATCH: per field, plus those that match no field.
  const [fieldErrors, setFieldErrors] = useState({});
  const [otherSaveErrors, setOtherSaveErrors] = useState([]);
  // Tab editors: 'academic' | 'fees', one open at a time.
  const [section, setSection] = useState(null);
  const [sectionForm, setSectionForm] = useState({});
  const [sectionSaving, setSectionSaving] = useState(false);
  const [sectionError, setSectionError] = useState('');
  const [sectionFieldErrors, setSectionFieldErrors] = useState({});
  // Delete draft (ADMIN).
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { course: data, meta: metaMap, publish: publishBlock, edit } = await courseService.getById(id);
      setCourse(data);
      setPublish(publishBlock);
      setEditIds(edit ?? {});
      setMeta(metaMap);
      // A reload after a save keeps the tab that was being edited.
      setActiveTab((prev) => ((data?.tabs ?? []).some((t) => t.key === prev) ? prev : data?.tabs?.[0]?.key ?? null));
      const feeItems = data?.feesAndScholarships?.items ?? {};
      const durationVal = edit?.courseDuration ?? data?.durationMonths ?? data?.courseDuration ?? data?.duration ?? location.state?.course?.durationMonths ?? '';
      setEditForm({
        courseName: data?.courseName ?? '',
        sysProgrammeId: edit?.sysProgrammeId ?? '',
        tuitionFee: feeItems.tuitionFees?.amount ?? '',
        currency: feeItems.tuitionFees?.currency ?? 'GBP',
        courseDuration: durationVal,
        applicationDeadline: edit?.applicationDeadline ?? '',
        externalUrl: edit?.externalUrl ?? '',
      });
    } catch (err) {
      console.error('Failed to load course:', err);
      setError(err.message || 'Failed to load this course.');
    } finally {
      setLoading(false);
    }
  };

  // PATCH /crm/courses/{courseId} is ADMIN-only and partial: send only what
  // changed, then re-read so the page shows what the server actually stored.
  const clearSaveErrors = () => {
    setSaveError('');
    setFieldErrors({});
    setOtherSaveErrors([]);
  };

  const closeEdit = () => {
    setShowEdit(false);
    clearSaveErrors();
  };

  const programmeOptionLabel = (item) => (item.isPublished === false ? `${item.name} (draft)` : item.name);

  // Options include drafts. The current programme stays selectable if the lookup omits it.
  const loadProgrammes = async () => {
    try {
      const rows = await courseService.listProgrammes();
      const options = rows.map((item) => ({ value: item.id, label: programmeOptionLabel(item) }));
      const currentId = editIds.sysProgrammeId;
      if (currentId && course?.programmeName && !options.some((option) => option.value === currentId)) {
        options.unshift({ value: currentId, label: course.programmeName });
      }
      setProgrammeOptions(options);
    } catch (err) {
      console.error('Failed to load programmes:', err);
      setFieldErrors((prev) => ({
        ...prev,
        sysProgrammeId: err.message || 'Could not load programmes.',
      }));
    }
  };

  // Editing a field clears the server's complaint about it.
  const setField = (name, value) => {
    setEditForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
  };

  const saveEdit = async () => {
    setSaving(true);
    clearSaveErrors();
    try {
      const patch = {};
      const errors = {};
      const coursePublished = publish?.courseIsPublished === true;
      const intakeLive = publish?.intakeIsPublished !== false;
      const url = String(editForm.externalUrl ?? '').trim();

      if (editForm.tuitionFee !== '') {
        const feeNum = Number(editForm.tuitionFee);
        if (Number.isNaN(feeNum) || feeNum <= 0) {
          setFieldErrors({ tuitionFee: 'Tuition fee must be a positive number greater than 0.' });
          setSaving(false);
          return;
        }
      }
      if (editForm.courseDuration !== '') {
        const durNum = Number(editForm.courseDuration);
        if (Number.isNaN(durNum) || durNum <= 0) {
          setFieldErrors({ courseDuration: 'Duration must be a positive number of months.' });
          setSaving(false);
          return;
        }
      }

      if (!coursePublished && editForm.courseName && editForm.courseName !== course.courseName) {
        patch.courseName = editForm.courseName;
      }
      const programmeId = String(editForm.sysProgrammeId ?? '');
      if (!coursePublished && programmeId && programmeId !== String(editIds.sysProgrammeId ?? '')) {
        patch.sysProgrammeId = programmeId;
      }
      const fee = String(editForm.tuitionFee ?? '').trim();
      const currency = String(editForm.currency ?? '').trim();
      const savedFee = String(course?.feesAndScholarships?.items?.tuitionFees?.amount ?? '').trim();
      const savedCurrency = String(course?.feesAndScholarships?.items?.tuitionFees?.currency ?? '').trim();
      const feeChanged = fee !== savedFee || currency.toUpperCase() !== savedCurrency.toUpperCase();
      if ((fee === '') !== (currency === '')) {
        errors.tuitionFee = 'Tuition fee and currency must be set together.';
        errors.currency = 'Tuition fee and currency must be set together.';
      } else if (intakeLive && fee === '' && feeChanged) {
        errors.tuitionFee = 'A published course must keep a tuition fee.';
        errors.currency = 'A published course must keep a currency.';
      } else if (feeChanged) {
        patch.tuitionFee = fee || null;
        patch.currency = currency || null;
      }
      if (intakeLive && String(editForm.courseDuration ?? '').trim() === '') {
        errors.courseDuration = 'A published course must keep a duration.';
      } else if (editForm.courseDuration !== '') {
        patch.courseDuration = Number(editForm.courseDuration);
      }
      if (url && !/^https?:\/\//i.test(url)) {
        errors.externalUrl = 'Enter a full link starting with http:// or https://.';
      } else if (coursePublished && !url) {
        errors.externalUrl = 'A published course must keep a course URL.';
      } else if (url !== String(editIds.externalUrl ?? '')) {
        patch.externalUrl = url || null;
      }
      const deadline = String(editForm.applicationDeadline ?? '').trim();
      const savedDeadline = String(editIds.applicationDeadline ?? '');
      if (deadline !== savedDeadline) {
        if (deadline && !isDmyDate(deadline)) {
          errors.applicationDeadline = 'date must be DD-MM-YYYY';
        } else {
          patch.applicationDeadline = deadline || null;
        }
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      if (Object.keys(patch).length === 0) { setShowEdit(false); return; }

      await courseService.update(id, patch);
      setShowEdit(false);
      await load();
    } catch (err) {
      console.error('Failed to update course:', err);
      // 400s can carry per-field messages, e.g. "Required fields cannot be
      // cleared on a published item". Fields this form does not have are
      // listed under the message.
      const { fieldErrors: byField, otherErrors } = splitFieldErrors(err.details, EDIT_FIELDS);
      setFieldErrors(byField);
      setOtherSaveErrors(otherErrors);
      setSaveError(err.message || 'Failed to update this course.');
    } finally {
      setSaving(false);
    }
  };

  // --- Tab editors (ADMIN) ------------------------------------------------------
  // Academic Info and Fees & Scholarships. Each sends only its own fields, and
  // only the ones that changed.
  const openSection = async (name) => {
    setSectionForm({
      academic: readAcademic(course, editIds),
      fees: readFees(course, editIds),
    }[name]);
    setSectionError('');
    setSectionFieldErrors({});
    setSection(name);

    if (name === 'academic' && degreeOptions.length === 0) {
      try {
        const degrees = await courseService.getAcademicDegrees();
        setDegreeOptions(degrees.map((d) => ({ value: d.id, label: d.name, gpaScale: d.gpaScale })));
      } catch (err) {
        console.error('Failed to load academic degrees:', err);
        setSectionError(err.message || 'Failed to load degree options.');
      }
    }
  };

  const closeSection = () => {
    setSection(null);
    setSectionError('');
    setSectionFieldErrors({});
  };

  // Editing a field clears the complaint about it.
  const setSectionField = (name, value) => {
    setSectionForm((prev) => ({ ...prev, [name]: value }));
    setSectionFieldErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
  };

  // Returns the PATCH body for the open editor, plus what is wrong with the
  // form, keyed by request field. Emptying a box that had a value clears it.
  const buildSectionPatch = () => {
    const patch = {};
    const errors = {};
    // Only an explicit `false` is a draft (same rule as the badge).
    const isLive = publish?.intakeIsPublished !== false;

    if (section === 'academic') {
      const before = readAcademic(course, editIds);
      const coursePublished = publish?.courseIsPublished === true;
      const entered = {
        minSysDegreeId: String(sectionForm.minSysDegreeId ?? '').trim(),
        higherSysDegreeId: String(sectionForm.higherSysDegreeId ?? '').trim(),
        minGpa: String(sectionForm.minGpa ?? '').trim(),
        higherGpa: String(sectionForm.higherGpa ?? '').trim(),
      };

      const scaleFor = (degreeId) => degreeOptions.find((d) => d.value === degreeId)?.gpaScale ?? null;
      const checkGpa = (field, degreeId) => {
        const value = entered[field];
        if (value === '') return;
        if (!GPA_PATTERN.test(value)) {
          errors[field] = 'Enter a GPA with up to 2 decimal places.';
          return;
        }
        const scale = scaleFor(degreeId);
        if (scale == null || Number.isNaN(Number(scale))) {
          errors[field] = 'This degree has no GPA scale.';
          return;
        }
        if (Number(value) < 0 || Number(value) > Number(scale)) {
          errors[field] = `Enter a GPA from 0 to ${Number(scale).toFixed(2)}.`;
        }
      };
      checkGpa('minGpa', entered.minSysDegreeId);
      checkGpa('higherGpa', entered.higherSysDegreeId);

      const pairs = [
        ['minSysDegreeId', 'minGpa', 'Minimum degree and minimum GPA must be set together.'],
        ['higherSysDegreeId', 'higherGpa', 'Higher degree and higher GPA must be set together.'],
      ];
      for (const [degreeField, gpaField, message] of pairs) {
        const hasDegree = entered[degreeField] !== '';
        const hasGpa = entered[gpaField] !== '';
        if (hasDegree !== hasGpa && !errors[gpaField]) {
          errors[hasDegree ? gpaField : degreeField] = message;
        }
      }

      if (coursePublished && entered.minSysDegreeId === '') {
        errors.minSysDegreeId = 'A published course must keep a minimum degree.';
      }
      if (coursePublished && entered.minGpa === '' && !errors.minGpa) {
        errors.minGpa = 'A published course must keep a minimum GPA.';
      }

      if (
        !errors.minGpa && !errors.higherGpa
        && entered.minGpa !== '' && entered.higherGpa !== ''
        && Number(entered.higherGpa) < Number(entered.minGpa)
      ) {
        errors.higherGpa = 'The higher degree GPA cannot be lower than the minimum degree GPA.';
      }

      const degreeChanged = (field) => entered[field] !== String(before[field] ?? '');
      const gpaChanged = (field) => !(entered[field] === before[field] || sameNumber(entered[field], before[field]));
      if (!errors.minSysDegreeId && !errors.minGpa && (degreeChanged('minSysDegreeId') || gpaChanged('minGpa'))) {
        patch.minSysDegreeId = entered.minSysDegreeId || null;
        patch.minGpa = entered.minGpa || null;
      }
      if (!errors.higherSysDegreeId && !errors.higherGpa && (degreeChanged('higherSysDegreeId') || gpaChanged('higherGpa'))) {
        patch.higherSysDegreeId = entered.higherSysDegreeId || null;
        patch.higherGpa = entered.higherGpa || null;
      }

      for (const t of ENGLISH_TESTS) {
        const overall = String(sectionForm[t.overall] ?? '').trim();
        const sectionScore = String(sectionForm[t.section] ?? '').trim();
        const beforeOverall = before[t.overall];
        const beforeSection = before[t.section];
        const overallChanged = !(overall === beforeOverall || sameNumber(overall, beforeOverall));
        const sectionChanged = !(sectionScore === beforeSection || sameNumber(sectionScore, beforeSection));
        if (!overallChanged && !sectionChanged) {
          if (t.name === 'IELTS' && coursePublished && overall === '') {
            errors[t.overall] = 'A published course must keep IELTS scores.';
          }
          continue;
        }

        if ((overall === '') !== (sectionScore === '')) {
          errors[overall === '' ? t.overall : t.section] = `${t.name} overall and section must be set together.`;
          continue;
        }
        if (t.name === 'IELTS' && coursePublished && overall === '') {
          errors[t.overall] = 'A published course must keep IELTS scores.';
          continue;
        }
        if (overall !== '' && !SCORE_PATTERN.test(overall)) {
          errors[t.overall] = 'Enter a score with up to 2 decimal places.';
        } else if (overall !== '' && t.max != null && Number(overall) > t.max) {
          errors[t.overall] = `${t.name} overall cannot exceed ${t.max}.`;
        }
        if (sectionScore !== '' && !SCORE_PATTERN.test(sectionScore)) {
          errors[t.section] = 'Enter a score with up to 2 decimal places.';
        } else if (sectionScore !== '' && t.max != null && Number(sectionScore) > t.max) {
          errors[t.section] = `${t.name} section cannot exceed ${t.max}.`;
        }
        if (errors[t.overall] || errors[t.section]) continue;

        patch[t.overall] = overall === '' ? null : overall;
        patch[t.section] = sectionScore === '' ? null : sectionScore;
      }
    }

    if (section === 'fees') {
      const before = readFees(course, editIds);
      for (const field of ['tuitionFee', 'initialDeposit', 'applicationFee']) {
        const value = String(sectionForm[field] ?? '').trim();
        if (value === before[field] || sameNumber(value, before[field])) continue;
        if (value === '') {
          if (field === 'tuitionFee' && isLive) errors.tuitionFee = 'A published course must keep a tuition fee.';
          else if (field === 'initialDeposit' && isLive) errors.initialDeposit = 'A published course must keep an initial deposit.';
          else patch[field] = null;
        } else if (!MONEY_PATTERN.test(value)) {
          errors[field] = 'Enter an amount with up to 2 decimal places, without commas.';
        } else {
          patch[field] = value;
        }
      }
      if (isLive && String(sectionForm.initialDeposit ?? '').trim() === '' && !errors.initialDeposit) {
        errors.initialDeposit = 'A published course must keep an initial deposit.';
      }

      const currency = String(sectionForm.currency ?? '').trim().toUpperCase();
      const feeNow = String(sectionForm.tuitionFee ?? '').trim();
      if ((feeNow === '') !== (currency === '')) {
        errors.tuitionFee = 'Tuition fee and currency must be set together.';
        errors.currency = 'Tuition fee and currency must be set together.';
        delete patch.tuitionFee;
        delete patch.currency;
      } else if (currency !== before.currency.toUpperCase()) {
        if (currency === '') {
          if (isLive) errors.currency = 'A published course must keep a currency.';
          else patch.currency = null;
        } else if (!/^[A-Z]{3}$/.test(currency)) {
          errors.currency = 'Use a 3-letter code such as GBP.';
        } else {
          patch.currency = currency;
        }
      }
      if (feeNow === '' && currency === '' && !isLive && (before.tuitionFee !== '' || before.currency !== '')) {
        patch.tuitionFee = null;
        patch.currency = null;
      }

      const name = String(sectionForm.scholarshipName ?? '').trim();
      const type = String(sectionForm.scholarshipType ?? '').trim();
      const amount = String(sectionForm.scholarshipAmount ?? '').trim();
      const hasName = name !== '';
      const hasType = type !== '';
      const hasAmount = amount !== '';
      const filled = [hasName, hasType, hasAmount].filter(Boolean).length;
      if (filled !== 0 && filled !== 3) {
        errors.scholarshipName = 'Scholarship name, type, and amount must be set together, or all left empty.';
      } else if (hasAmount && !MONEY_PATTERN.test(amount)) {
        errors.scholarshipAmount = 'Enter an amount with up to 2 decimal places, without commas.';
      } else {
        const beforeAmount = String(before.scholarshipAmount ?? '');
        const changed = name !== String(before.scholarshipName ?? '')
          || type !== String(before.scholarshipType ?? '')
          || !(amount === beforeAmount || sameNumber(amount, beforeAmount));
        if (changed) {
          patch.scholarshipName = hasName ? name : null;
          patch.scholarshipType = hasType ? type : null;
          patch.scholarshipAmount = hasAmount ? amount : null;
        }
      }

      const nextMeta = cleanMetaBlocks(sectionForm.scholarshipMeta);
      const prevMeta = cleanMetaBlocks(before.scholarshipMeta);
      if (JSON.stringify(nextMeta) !== JSON.stringify(prevMeta)) {
        patch.scholarshipMetaData = nextMeta.length ? nextMeta : null;
      }
    }

    return { patch, errors };
  };

  const saveSection = async () => {
    const { patch, errors } = buildSectionPatch();
    if (Object.keys(errors).length > 0) {
      setSectionFieldErrors(errors);
      return;
    }
    if (Object.keys(patch).length === 0) { closeSection(); return; }

    setSectionSaving(true);
    setSectionError('');
    setSectionFieldErrors({});
    try {
      await courseService.update(id, patch);
      closeSection();
      toast.success('Course updated.');
      await load();
    } catch (err) {
      console.error('Failed to update course:', err);
      const { fieldErrors: byField, otherErrors } = splitFieldErrors(err.details, SECTION_FIELDS[section]);
      setSectionFieldErrors(byField);
      setSectionError([err.message || 'Failed to update this course.', ...otherErrors].join(' '));
    } finally {
      setSectionSaving(false);
    }
  };

  // DELETE /crm/courses/{courseId} (ADMIN): removes this draft intake plus its
  // draft course data. Refused with 409 once it has ever been published.
  const deleteDraft = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await courseService.deleteDraft(id);
      toast.success('Draft course deleted.');
      navigate(backTo, { replace: true });
    } catch (err) {
      console.error('Failed to delete draft course:', err);
      setDeleteError(err.message || 'Failed to delete this course.');
    } finally {
      setDeleting(false);
    }
  };

  // Info dots keep their display keys. Save writes the real column instead.
  const closeMeta = () => {
    setOpenMeta(null);
    setMetaEditing(false);
    setMetaSaveError('');
  };

  const openMetaEditor = () => {
    setMetaSaveError('');
    if (openMeta?.infoKey === 'feesAndScholarshipsMetaData') {
      setFeesMetaDraft(metaBlocksFrom(editIds.feesMetaData));
      setScholarshipMetaDraft(metaBlocksFrom(editIds.scholarshipMetaData));
    } else {
      setMetaDraft(metaBlocksFrom(openMeta?.information));
    }
    setMetaEditing(true);
  };

  const saveMeta = async () => {
    if (!openMeta?.infoKey) return;
    setMetaSaving(true);
    setMetaSaveError('');
    try {
      const key = openMeta.infoKey;
      if (key === 'academicRequirementsMetaData') {
        await courseService.update(id, { requirementMetaData: storedMeta(metaDraft) });
      } else if (key === 'intakeDatesMetaData') {
        await courseService.update(id, { intakeMetaData: storedMeta(metaDraft) });
      } else if (key === 'rankingMetaData') {
        const uniId = course?.university?.uniId;
        if (!uniId) {
          setMetaSaveError('This course has no university to update.');
          return;
        }
        const ranking = storedMeta(metaDraft);
        if (publish?.universityIsPublished && !ranking) {
          setMetaSaveError('A published university must keep ranking information.');
          return;
        }
        await crmUniversityService.update(uniId, { rankingMetaData: ranking });
      } else if (key === 'feesAndScholarshipsMetaData') {
        await courseService.update(id, {
          feesMetaData: storedMeta(feesMetaDraft),
          scholarshipMetaData: storedMeta(scholarshipMetaDraft),
        });
      } else {
        setMetaSaveError('This information cannot be saved from the course page.');
        return;
      }
      closeMeta();
      await load();
    } catch (err) {
      console.error('Failed to update course info:', err);
      setMetaSaveError(err.message || 'Failed to update this info.');
    } finally {
      setMetaSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: colors.textSecondary }}>Loading course...</div>;
  }

  if (!course) {
    return (
      <div style={{ maxWidth: '520px', margin: '40px auto', textAlign: 'center' }}>
        <h2 style={{ color: colors.textPrimary }}>Course not found</h2>
        {error && <Alert variant="error" style={{ textAlign: 'left', marginTop: '16px' }}>{error}</Alert>}
        <Button onClick={() => navigate(backTo)} style={{ marginTop: '16px' }}>
          {backLabelFor(backTo, 'Back to Courses')}
        </Button>
      </div>
    );
  }

  // Only an explicit `false` is a draft; a backend without the publish block
  // keeps behaving as "everything is live".
  const isDraft = publish?.intakeIsPublished === false;
  const uni = course.university ?? {};
  const openMetaModal = (m) => { setOpenMeta(m); setMetaEditing(false); setMetaSaveError(''); };
  const goToUniversity = () => {
    const uniId = uni.uniId || uni.id || course.universityId;
    if (!uniId) return;
    navigate(`/universities/${uniId}`, {
      state: {
        // Lets the university page's Back link return to this course.
        from: location.pathname,
        university: {
          id: uniId,
          name: uni.uniName || uni.name,
          logoUrl: uni.uniLogoUrl || uni.logoUrl,
          imgUrl: uni.uniCoverImageUrl || uni.coverImageUrl,
          country: course.location?.country,
          state: course.location?.state,
          city: course.location?.city,
        },
      },
    });
  };

  // `hasInfo` on these two sections only says whether there is info-dot text;
  // the rows themselves are shown whenever the course has them.
  const req = course.academicRequirements?.requirements;
  const hasRequirements = (req?.degreeRequirements ?? []).length + (req?.englishRequirements ?? []).length > 0;
  const fees = course.feesAndScholarships?.items;

  return (
    <div>
      <button
        onClick={() => navigate(backTo)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent',
          border: 'none', color: colors.textSecondary, cursor: 'pointer',
          marginBottom: '20px', fontSize: '14px', fontFamily: 'inherit', padding: 0,
        }}
      >
        <ArrowLeft size={18} /> {backLabelFor(backTo, 'Back to Courses')}
      </button>

      <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert>

      {/* Cover + header */}
      <Card padding="0" style={{ overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ height: isMobile ? '160px' : '240px', backgroundColor: colors.appBg, overflow: 'hidden' }}>
          {uni.uniCoverImageUrl && (
            <img
              src={uni.uniCoverImageUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
        </div>

        <div style={{ padding: isMobile ? '20px' : '24px 32px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: isMobile ? 'stretch' : 'flex-start',
            flexDirection: isMobile ? 'column' : 'row', gap: '16px',
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <h1 style={{ margin: 0, fontSize: isMobile ? '20px' : '26px', color: colors.textPrimary }}>
                  {course.courseName}
                </h1>
                {isDraft && <DraftBadge size="medium" />}
              </div>
              {course.programmeName && (
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: colors.textSecondary }}>
                  {course.programmeName}
                </p>
              )}

              {(isDraft || (isAdmin && publish?.importBatchId)) && (
                <div style={{ marginBottom: '10px', fontSize: '13px', color: colors.textSecondary }}>
                  {isDraft && 'Not published yet, so students cannot see this course. '}
                  {isDraft && publish?.universityIsPublished === false && 'The university is also a draft. '}
                  {/* Bulk Imports is an ADMIN-only screen. */}
                  {isAdmin && publish?.importBatchId && (
                    <Link
                      to={`/bulk-imports/${publish.importBatchId}`}
                      style={{ color: colors.brandPrimary, fontWeight: '500', textDecoration: 'underline' }}
                    >
                      View the import it came from
                    </Link>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {course.ranking?.position != null && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', color: colors.brandPrimary, fontWeight: '700' }}>
                    #{course.ranking.position}
                    <InfoDot meta={meta[course.ranking.infoKey]} onOpen={openMetaModal} />
                  </span>
                )}
                <span style={{ color: colors.textMuted }}>•</span>
                <button
                  type="button"
                  onClick={goToUniversity}
                  style={{
                    border: 'none', background: 'transparent', padding: 0,
                    color: colors.brandPrimary, fontWeight: '600', fontSize: '15px',
                    fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'underline',
                  }}
                >
                  {uni.uniName}
                </button>
                {uni.uniLogoUrl && (
                  <img
                    src={uni.uniLogoUrl}
                    alt=""
                    style={{ height: '26px', objectFit: 'contain' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(course.tags ?? []).map((tag) => (
                  <Badge key={`${tag.type}-${tag.label}`} variant={tag.type === 'location' ? 'info' : 'default'} size="small">
                    {tag.label}
                  </Badge>
                ))}
              </div>
            </div>

            {isAdmin && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flexShrink: 0 }}>
                <Button icon={Edit2} variant="secondary" onClick={() => { clearSaveErrors(); setShowEdit(true); loadProgrammes(); }}>
                  Edit
                </Button>
                {isDraft && (
                  <Button icon={Trash2} variant="secondary" onClick={() => { setDeleteError(''); setShowDelete(true); }}>
                    Delete draft
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs - driven by the backend's tabs[] */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '20px',
        borderBottom: `1px solid ${colors.borderLight}`, overflowX: 'auto',
      }}>
        {(course.tabs ?? []).map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 18px', border: 'none', background: 'transparent',
                cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit',
                fontWeight: active ? '600' : '500', whiteSpace: 'nowrap',
                color: active ? colors.brandPrimary : colors.textSecondary,
                borderBottom: `2px solid ${active ? colors.brandPrimary : 'transparent'}`,
                marginBottom: '-1px',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      {activeTab === 'aboutUs' && (
        <Card>
          <SectionTitle>About Us</SectionTitle>
          {(course.aboutUs?.description ?? []).length ? (
            course.aboutUs.description.map((p, i) => (
              <p key={i} style={{ margin: '0 0 12px', color: colors.textSecondary, lineHeight: 1.7 }}>{p}</p>
            ))
          ) : <p style={{ color: colors.textSecondary }}>No description available.</p>}
        </Card>
      )}

      {activeTab === 'campusLife' && (
        <Card>
          <SectionTitle>Campus Life</SectionTitle>
          {(course.campusLife?.media?.videoUrl ?? []).length ? (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
              {course.campusLife.media.videoUrl.map((url) => {
                const vid = youTubeId(url);
                return (
                  <div key={url} style={{ borderRadius: '10px', overflow: 'hidden', backgroundColor: colors.appBg }}>
                    {vid ? (
                      <iframe
                        title={url}
                        src={`https://www.youtube.com/embed/${vid}`}
                        style={{ width: '100%', aspectRatio: '16 / 9', border: 'none', display: 'block' }}
                        allowFullScreen
                      />
                    ) : (
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '20px', color: colors.brandPrimary }}>
                        <PlayCircle size={18} /> Watch video
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          ) : <p style={{ color: colors.textSecondary }}>No campus media available.</p>}
        </Card>
      )}

      {activeTab === 'location' && (
        <Card>
          <SectionTitle>Location</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.textPrimary, marginBottom: '14px' }}>
            <MapPin size={16} style={{ color: colors.brandPrimary }} />
            {[course.location?.address, course.location?.state].filter(Boolean).join(', ') || 'Not specified'}
          </div>
          {course.location?.coordinates?.link && (
            <a
              href={course.location.coordinates.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: colors.brandPrimary, fontSize: '14px', fontWeight: '500' }}
            >
              <ExternalLink size={14} /> Open in Maps
            </a>
          )}
        </Card>
      )}

      {activeTab === 'academicRequirements' && (
        <Card>
          <SectionTitle
            meta={meta[course.academicRequirements?.infoKey]}
            onOpenMeta={openMetaModal}
            action={isAdmin ? (
              <Button variant="ghost" size="small" icon={Edit2} onClick={() => openSection('academic')}>Edit</Button>
            ) : undefined}
          >
            Academic Requirements
          </SectionTitle>
          {hasRequirements ? (
            <>
              {(req.degreeRequirements ?? []).map((d, i) => (
                <Row key={`deg-${i}`} label={`${d.degreeName} (${d.label})`} value={d.minValue} />
              ))}
              {(req.englishRequirements ?? []).map((t, i) => (
                <Row
                  key={`eng-${i}`}
                  label={t.testName}
                  value={`Overall: ${t.minOverallValue}${t.minSectionValue ? ` / Min Section: ${t.minSectionValue}` : ''}`}
                />
              ))}
              {(!req.degreeRequirements?.length && !req.englishRequirements?.length) && (
                <p style={{ color: colors.textSecondary }}>No specific degree or English requirements listed.</p>
              )}
            </>
          ) : <p style={{ color: colors.textSecondary }}>No academic requirements published.</p>}
        </Card>
      )}

      {activeTab === 'feesAndScholarships' && (
        <Card>
          <SectionTitle
            meta={meta[course.feesAndScholarships?.infoKey]}
            onOpenMeta={openMetaModal}
            action={isAdmin ? (
              <Button variant="ghost" size="small" icon={Edit2} onClick={() => openSection('fees')}>Edit</Button>
            ) : undefined}
          >
            Fees &amp; Scholarships
          </SectionTitle>
          {fees ? (
            <>
              <Row
                label="Tuition Fees"
                value={fees.tuitionFees
                  ? `${fees.tuitionFees.currency ?? ''}${Number(fees.tuitionFees.amount).toLocaleString()}${fees.tuitionFees.frequency ? `/${fees.tuitionFees.frequency}` : ''}`
                  : null}
              />
              <Row label="Initial Deposit" value={fees.initialDeposit} />
              <Row label="Application Fee" value={fees.applicationFee != null ? Number(fees.applicationFee).toLocaleString() : null} />
              <Row label="Scholarships" value={fees.scholarships} />
              {editIds.scholarshipName && (
                <Row
                  label="Scholarship"
                  value={`${editIds.scholarshipName}${editIds.scholarshipAmount != null ? ` · ${editIds.scholarshipAmount}` : ''}${editIds.scholarshipType ? ` (${editIds.scholarshipType})` : ''}`}
                />
              )}
            </>
          ) : <p style={{ color: colors.textSecondary }}>No fee information published.</p>}
        </Card>
      )}

      {activeTab === 'intakeDates' && (
        <Card>
          <SectionTitle meta={meta[course.intakeDates?.infoKey]} onOpenMeta={openMetaModal}>
            Intake Dates
          </SectionTitle>
          {(course.intakeDates?.intakes ?? []).length ? (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {course.intakeDates.intakes.map((m) => <Badge key={m} variant="info">{m}</Badge>)}
            </div>
          ) : <p style={{ color: colors.textSecondary }}>No intakes listed for the current year.</p>}
        </Card>
      )}

      {/* Meta tooltip content - editable in place via PATCH /crm/courses/{id} */}
      <Modal
        isOpen={!!openMeta}
        onClose={closeMeta}
        title={openMeta?.title ?? ''}
        size="small"
        footer={metaEditing ? (
          <>
            <Button variant="ghost" onClick={() => setMetaEditing(false)}>Cancel</Button>
            <Button onClick={saveMeta} disabled={metaSaving}>{metaSaving ? 'Saving...' : 'Save'}</Button>
          </>
        ) : undefined}
      >
        <Alert variant="error" onDismiss={() => setMetaSaveError('')}>{metaSaveError}</Alert>

        {metaEditing ? (
          openMeta?.infoKey === 'feesAndScholarshipsMetaData' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: colors.textPrimary }}>Fees</h4>
                <MetaBlockList blocks={feesMetaDraft} onChange={setFeesMetaDraft} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: colors.textPrimary }}>Scholarship</h4>
                <MetaBlockList blocks={scholarshipMetaDraft} onChange={setScholarshipMetaDraft} />
              </div>
            </div>
          ) : (
            <MetaBlockList blocks={metaDraft} onChange={setMetaDraft} />
          )
        ) : (
          <>
            {(openMeta?.information ?? []).map((block, i) => (
              <div key={i} style={{ marginBottom: '16px' }}>
                {block.subtitle && (
                  <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: colors.textPrimary }}>{block.subtitle}</h4>
                )}
                {(block.description ?? []).map((d, j) => (
                  <p key={j} style={{ margin: '0 0 6px', color: colors.textSecondary, lineHeight: 1.6, fontSize: '14px' }}>{d}</p>
                ))}
              </div>
            ))}
            {isAdmin && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="ghost" size="small" icon={Edit2} onClick={openMetaEditor}>Edit</Button>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Course edit - PATCH /crm/courses/{id}, ADMIN only */}
      <Modal
        isOpen={showEdit}
        onClose={closeEdit}
        title="Edit Course"
        size="small"
        footer={(
          <>
            <Button variant="ghost" onClick={closeEdit}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </>
        )}
      >
        <Alert variant="error" onDismiss={() => { setSaveError(''); setOtherSaveErrors([]); }}>
          {saveError && (
            <>
              {saveError}
              {otherSaveErrors.length > 0 && (
                <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                  {otherSaveErrors.map((line) => <li key={line}>{line}</li>)}
                </ul>
              )}
            </>
          )}
        </Alert>
        <Input
          label="Course Name"
          name="courseName"
          value={editForm.courseName}
          error={fieldErrors.courseName}
          disabled={publish?.courseIsPublished === true}
          onChange={(e) => setField('courseName', e.target.value)}
        />
        <Select
          label="Programme"
          name="sysProgrammeId"
          value={editForm.sysProgrammeId}
          options={programmeOptions}
          error={fieldErrors.sysProgrammeId}
          disabled={publish?.courseIsPublished === true}
          placeholder="Select a programme"
          onChange={(e) => setField('sysProgrammeId', e.target.value)}
        />
        <Input
          label="Course URL"
          name="externalUrl"
          value={editForm.externalUrl}
          error={fieldErrors.externalUrl}
          placeholder="https://"
          onChange={(e) => setField('externalUrl', e.target.value)}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
          <Input
            label="Tuition Fee"
            name="tuitionFee"
            type="number"
            value={editForm.tuitionFee}
            error={fieldErrors.tuitionFee}
            onChange={(e) => setField('tuitionFee', e.target.value)}
          />
          <Select
            label="Currency"
            name="currency"
            value={editForm.currency}
            error={fieldErrors.currency}
            onChange={(e) => setField('currency', e.target.value)}
            options={[
              { value: 'GBP', label: 'GBP (£)' },
              { value: 'USD', label: 'USD ($)' },
              { value: 'CAD', label: 'CAD (C$)' },
              { value: 'AUD', label: 'AUD (A$)' },
              { value: 'EUR', label: 'EUR (€)' },
              { value: 'BDT', label: 'BDT (৳)' },
            ]}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input
            label="Duration (months)"
            name="courseDuration"
            type="number"
            value={editForm.courseDuration}
            error={fieldErrors.courseDuration}
            onChange={(e) => setField('courseDuration', e.target.value)}
          />
          <Input
            label="Application Deadline"
            name="applicationDeadline"
            placeholder="DD-MM-YYYY"
            value={editForm.applicationDeadline}
            error={fieldErrors.applicationDeadline}
            onChange={(e) => setField('applicationDeadline', e.target.value)}
          />
        </div>
        <p style={{ margin: '-4px 0 0', fontSize: '12px', color: colors.textSecondary }}>
          Deadline uses DD-MM-YYYY, for example 30-06-2027. Tuition fee and currency are saved together. Leave the deadline blank to clear it.
        </p>
      </Modal>

      {/* Academic Info / Fees & Scholarships - PATCH /crm/courses/{id}, ADMIN only */}
      <Modal
        isOpen={!!section}
        onClose={closeSection}
        title={SECTION_TITLES[section] ?? ''}
        size="medium"
        footer={(
          <>
            <Button variant="ghost" onClick={closeSection}>Cancel</Button>
            <Button onClick={saveSection} disabled={sectionSaving}>{sectionSaving ? 'Saving...' : 'Save'}</Button>
          </>
        )}
      >
        <Alert variant="error" onDismiss={() => setSectionError('')}>{sectionError}</Alert>

        {section === 'academic' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
              <Select
                label="Minimum degree"
                name="minSysDegreeId"
                value={sectionForm.minSysDegreeId ?? ''}
                options={degreeOptions}
                error={sectionFieldErrors.minSysDegreeId}
                onChange={(e) => setSectionField('minSysDegreeId', e.target.value)}
              />
              <Input
                label={sectionForm.minSysDegreeId
                  ? `Minimum degree GPA (out of ${formatGpaScale(degreeOptions.find((d) => d.value === sectionForm.minSysDegreeId)?.gpaScale)})`
                  : 'Minimum degree GPA'}
                name="minGpa" inputMode="decimal" placeholder="e.g. 4.50"
                value={sectionForm.minGpa ?? ''}
                error={sectionFieldErrors.minGpa}
                onChange={(e) => setSectionField('minGpa', e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
              <Select
                label="Higher degree"
                name="higherSysDegreeId"
                value={sectionForm.higherSysDegreeId ?? ''}
                options={degreeOptions}
                error={sectionFieldErrors.higherSysDegreeId}
                onChange={(e) => setSectionField('higherSysDegreeId', e.target.value)}
              />
              <Input
                label={sectionForm.higherSysDegreeId
                  ? `Higher degree GPA (out of ${formatGpaScale(degreeOptions.find((d) => d.value === sectionForm.higherSysDegreeId)?.gpaScale)})`
                  : 'Higher degree GPA'}
                name="higherGpa" inputMode="decimal" placeholder="e.g. 3.00"
                value={sectionForm.higherGpa ?? ''}
                error={sectionFieldErrors.higherGpa}
                onChange={(e) => setSectionField('higherGpa', e.target.value)}
              />
            </div>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: colors.textSecondary }}>
              A GPA only appears on the page once its degree is set, and it cannot be higher than that degree's scale. Empty a box to clear that value.
            </p>
            {ENGLISH_TESTS.map((t) => (
              <div
                key={t.name}
                style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}
              >
                <Input
                  label={`${t.name} overall`} name={t.overall} inputMode="decimal"
                  placeholder={t.name === 'IELTS' ? 'e.g. 6.00' : t.name === 'PTE' ? 'e.g. 59' : 'e.g. 4.5'}
                  value={sectionForm[t.overall] ?? ''}
                  error={sectionFieldErrors[t.overall]}
                  onChange={(e) => setSectionField(t.overall, e.target.value)}
                />
                <Input
                  label={`${t.name} section`} name={t.section} inputMode="decimal"
                  placeholder={t.name === 'IELTS' ? 'e.g. 5.50' : t.name === 'PTE' ? 'e.g. 59' : 'e.g. 4'}
                  value={sectionForm[t.section] ?? ''}
                  error={sectionFieldErrors[t.section]}
                  onChange={(e) => setSectionField(t.section, e.target.value)}
                />
              </div>
            ))}
          </>
        )}

        {section === 'fees' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '12px' }}>
              <Input
                label="Tuition Fee (yearly)" name="tuitionFee" inputMode="decimal" placeholder="e.g. 19220"
                value={sectionForm.tuitionFee ?? ''}
                error={sectionFieldErrors.tuitionFee}
                onChange={(e) => setSectionField('tuitionFee', e.target.value)}
              />
              <Input
                label="Currency" name="currency" maxLength={3} placeholder="GBP"
                value={sectionForm.currency ?? ''}
                error={sectionFieldErrors.currency}
                onChange={(e) => setSectionField('currency', e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
              <Input
                label="Initial Deposit" name="initialDeposit" inputMode="decimal" placeholder="e.g. 1000"
                value={sectionForm.initialDeposit ?? ''}
                error={sectionFieldErrors.initialDeposit}
                onChange={(e) => setSectionField('initialDeposit', e.target.value)}
              />
              <Input
                label="Application Fee" name="applicationFee" inputMode="decimal" placeholder="e.g. 50"
                value={sectionForm.applicationFee ?? ''}
                error={sectionFieldErrors.applicationFee}
                onChange={(e) => setSectionField('applicationFee', e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', margin: '8px 0' }}>
              <span style={{ fontSize: '14px', fontWeight: '500', color: colors.textPrimary }}>Scholarship</span>
              <Badge variant={scholarshipBadge(sectionForm.scholarshipMeta) === 'Available' ? 'success' : 'default'}>
                {scholarshipBadge(sectionForm.scholarshipMeta)}
              </Badge>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: colors.textSecondary }}>
              Available or not available follows the metadata below. Name, type, and amount are saved as one set.
            </p>
            <Input
              label="Scholarship name" name="scholarshipName" maxLength={255}
              value={sectionForm.scholarshipName ?? ''}
              error={sectionFieldErrors.scholarshipName}
              onChange={(e) => setSectionField('scholarshipName', e.target.value)}
            />
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
              <Select
                label="Type" name="scholarshipType"
                value={sectionForm.scholarshipType ?? ''}
                options={[
                  { value: 'PERCENTAGE', label: 'Percentage' },
                  { value: 'AMOUNT', label: 'Amount' },
                ]}
                placeholder="Select a type"
                error={sectionFieldErrors.scholarshipType}
                onChange={(e) => setSectionField('scholarshipType', e.target.value)}
              />
              <Input
                label="Amount" name="scholarshipAmount" inputMode="decimal" placeholder="e.g. 5000"
                value={sectionForm.scholarshipAmount ?? ''}
                error={sectionFieldErrors.scholarshipAmount}
                onChange={(e) => setSectionField('scholarshipAmount', e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              {(sectionForm.scholarshipMeta ?? []).map((block, i) => (
                <div key={i} style={{ border: `1px solid ${colors.borderLight}`, borderRadius: '8px', padding: '12px' }}>
                  {/* <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="ghost" size="small" icon={Trash2} aria-label="Remove scholarship block"
                      onClick={() => setSectionField('scholarshipMeta', sectionForm.scholarshipMeta.filter((_, j) => j !== i))}
                    />
                  </div> */}
                  <Input
                    label="Subtitle"
                    value={block.subtitle}
                    onChange={(e) => setSectionField('scholarshipMeta', sectionForm.scholarshipMeta.map((b, j) => (
                      j === i ? { ...b, subtitle: e.target.value } : b
                    )))}
                  />
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: colors.textSecondary }}>
                    Description (one line per paragraph)
                  </label>
                  <textarea
                    value={(block.description ?? []).join('\n')}
                    onChange={(e) => setSectionField('scholarshipMeta', sectionForm.scholarshipMeta.map((b, j) => (
                      j === i ? { ...b, description: e.target.value.split('\n') } : b
                    )))}
                    style={{
                      width: '100%', minHeight: '80px', padding: '8px 10px', borderRadius: '6px',
                      border: `1px solid ${sectionFieldErrors.scholarshipMetaData ? colors.error : colors.borderLight}`,
                      fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
              {/* <Button
                variant="ghost" size="small" icon={Plus}
                onClick={() => setSectionField('scholarshipMeta', [...(sectionForm.scholarshipMeta ?? []), { subtitle: '', description: [''] }])}
              >
                Add metadata block
              </Button> */}
              {sectionFieldErrors.scholarshipMetaData && (
                <div style={{ fontSize: '12px', color: colors.error }}>{sectionFieldErrors.scholarshipMetaData}</div>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: colors.textSecondary }}>
              Empty a money box to remove that value. Leave name, type, and amount empty together to remove the scholarship.
            </p>
          </>
        )}
      </Modal>

      {/* Delete draft - DELETE /crm/courses/{id}. ADMIN, never-published drafts only. */}
      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={deleteDraft}
        title="Delete draft course"
        confirmLabel="Delete draft"
        busyLabel="Deleting..."
        busy={deleting}
        error={deleteError}
      >
        Delete the draft <strong>{course.courseName}</strong>? This removes this intake and its draft course data,
        and cannot be undone. Published data is not affected.
      </ConfirmDialog>
    </div>
  );
};

export default CourseDetails;
