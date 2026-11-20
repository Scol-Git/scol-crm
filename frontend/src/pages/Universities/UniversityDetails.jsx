import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Globe, Edit2, ExternalLink, Info, GraduationCap, CalendarRange, Plus, Trash2, Send, BookOpen } from 'lucide-react';
import { Card, Button, Badge, Modal, Input, Select, Alert, DraftBadge, ConfirmDialog, PublishPreviewDialog } from '../../components';
import { useAuth, useToast } from '../../context';
import { crmUniversityService } from '../../services';
import IntakeFees from './IntakeFees';
import { splitFieldErrors } from '../../utils/formErrors';
import { backLabelFor, describePublishCounts } from '../../utils/format';
import { colors } from '../../theme';

// Backed by GET /crm/universities/{uniId}; edits go through
// PATCH /crm/universities/{uniId} (ADMIN only).
//
// Draft/publish: a university imported by a bulk upload starts as a draft
// (isPublished false). ADMIN can publish it (after a preview) or, while it has
// never been published, delete it. Counsellors get a 404 for drafts, which
// lands on the "not found" view below. Edit / publish / delete / reorder are
// shown to ADMIN only.

// The edit form's fields; also the names PATCH validation errors are keyed by.
const EDIT_FIELDS = ['uniName', 'website', 'establishedYear', 'universityType', 'address', 'aboutUs', 'currRanking', 'sysCountryId', 'sysStateId', 'sysCityId'];

// Campus Life, Location and Commission each have their own small editor. They
// all save through the same PATCH; these are the request fields each one owns.
const SECTION_FIELDS = {
  campus: ['campusLifeLinks'],
  location: ['address', 'locationMapMetaData'],
  commission: ['commission', 'commissionType'],
  cover: ['coverImageUrl'],
  logo: ['logoUrl'],
};
const SECTION_TITLES = {
  campus: 'Edit Campus Life',
  location: 'Edit Location',
  commission: 'Edit Commission',
  cover: 'Change Cover Image',
  logo: 'Change Logo',
};
const ASSET_MAX_BYTES = 5 * 1024 * 1024;
const ASSET_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const COMMISSION_TYPES = [
  { value: 'PERCENTAGE', label: 'Percentage (%)' },
  { value: 'AMOUNT', label: 'Fixed amount' },
];

const geoOptionLabel = (item) => (item.isPublished === false ? `${item.name} (draft)` : item.name);
const mapExampleMark = {
  backgroundColor: colors.statusContacted,
  color: colors.textPrimary,
  borderRadius: '3px',
  padding: '0 2px',
};
const toGeoOptions = (items) => (items ?? []).map((item) => ({ value: item.id, label: geoOptionLabel(item) }));

const locationMapValue = (href) => (href ? JSON.stringify({ href }) : null);

const mapEmbedSrc = (link) => {
  if (!link) return null;
  try {
    const url = new URL(link);
    const host = url.hostname.replace(/^www\./, '');
    if (url.pathname.includes('/maps/embed')) return url.href;
    const isMapsHost = host.startsWith('maps.google.') || (host.startsWith('google.') && url.pathname.startsWith('/maps'));
    if (!isMapsHost) return null;
    url.searchParams.set('output', 'embed');
    return url.href;
  } catch {
    return null;
  }
};

const isHttpUrl = (value) => {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

const AssetEditor = ({ label, name, value, error, onChange, onFile, uploading, help }) => {
  const inputRef = useRef(null);
  const url = (value ?? '').trim();
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ASSET_TYPES.join(',')}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onFile(file);
        }}
      />
      <Button
        variant="secondary"
        icon={Edit2}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{ marginBottom: '12px' }}
      >
        {uploading ? 'Uploading...' : 'Choose image'}
      </Button>
      <p style={{ margin: '0 0 12px', fontSize: '13px', color: colors.textSecondary }}>
        JPEG, PNG, or WebP. 5 MB maximum. Choosing a file uploads it and fills the link below.
      </p>
      <Input
        label={label}
        name={name}
        value={value ?? ''}
        maxLength={2048}
        placeholder="https://..."
        error={error}
        onChange={(e) => onChange(e.target.value)}
      />
      {isHttpUrl(url) && (
        <img
          src={url}
          alt="This link did not load as an image."
          style={{
            display: 'block', width: '100%', maxHeight: '260px', objectFit: 'contain',
            marginBottom: '12px', borderRadius: '8px', backgroundColor: colors.appBg,
            fontSize: '13px', color: colors.textSecondary,
          }}
        />
      )}
      <p style={{ margin: 0, fontSize: '13px', color: colors.textSecondary }}>{help}</p>
    </>
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

const youTubeId = (url = '') => {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  return m ? m[1] : null;
};

const thumbBox = {
  width: 120,
  height: 68,
  borderRadius: 8,
  flexShrink: 0,
  backgroundColor: colors.appBg,
};

const CampusVideoThumb = ({ url }) => {
  const id = youTubeId(url);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [id]);

  if (!id || failed) {
    return <div aria-hidden="true" style={thumbBox} />;
  }

  return (
    <img
      src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`}
      alt=""
      onError={() => setFailed(true)}
      style={{ ...thumbBox, objectFit: 'cover', display: 'block' }}
    />
  );
};

const UniversityDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const toast = useToast();

  // Where the user came from (universities list, course search, a course), so
  // Back returns there with its filters intact.
  const backTo = typeof location.state?.from === 'string' ? location.state.from : '/universities';

  const [university, setUniversity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [openMeta, setOpenMeta] = useState(null);
  const [metaEditing, setMetaEditing] = useState(false);
  const [metaDraft, setMetaDraft] = useState([]);
  const [metaSaving, setMetaSaving] = useState(false);
  const [metaSaveError, setMetaSaveError] = useState('');

  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  // Validation errors from a failed PATCH: per field, plus those that match no field.
  const [fieldErrors, setFieldErrors] = useState({});
  const [otherSaveErrors, setOtherSaveErrors] = useState([]);
  // Draft actions (ADMIN).
  const [showPublish, setShowPublish] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  // Section editors: 'campus' | 'location' | 'commission', one open at a time.
  const [section, setSection] = useState(null);
  const [sectionForm, setSectionForm] = useState({});
  const [sectionSaving, setSectionSaving] = useState(false);
  const [assetUploading, setAssetUploading] = useState(false);
  const [sectionError, setSectionError] = useState('');
  const [sectionFieldErrors, setSectionFieldErrors] = useState({});
  // The cover link is free text, so it may not point at an image at all.
  const [coverFailed, setCoverFailed] = useState(false);
  // Stage-flow editor: a working copy of the ordered stage list.
  const [showStageEdit, setShowStageEdit] = useState(false);
  const [stageDraft, setStageDraft] = useState([]);
  const [stageSaving, setStageSaving] = useState(false);
  const [stageError, setStageError] = useState('');
  const [form, setForm] = useState({
    uniName: '', website: '', establishedYear: '', universityType: '',
    address: '', aboutUs: '', currRanking: '',
    countryId: '', stateId: '', cityId: '',
  });
  const [geoOptions, setGeoOptions] = useState({ countries: [], states: [], cities: [] });
  const [geoLoading, setGeoLoading] = useState(false);
  const geoRequest = useRef(0);

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
      const data = await crmUniversityService.getById(id);
      setUniversity(data);
      setCoverFailed(false);
      setForm({
        uniName: data.uniName ?? '',
        website: data.website ?? '',
        establishedYear: data.establishedYear ?? '',
        universityType: data.universityType ?? '',
        address: data.location?.address ?? '',
        countryId: data.location?.countryId ?? '',
        stateId: data.location?.stateId ?? '',
        cityId: data.location?.cityId ?? '',
        // The read endpoint returns paragraphs as an array; the write endpoint
        // expects one string with blank lines between paragraphs.
        aboutUs: (data.aboutUs ?? []).join('\n\n'),
        currRanking: data.ranking?.position ?? '',
      });
    } catch (err) {
      console.error('Failed to load university:', err);
      setError(err.message || 'Failed to load this university.');
      setUniversity(null);
    } finally {
      setLoading(false);
    }
  };

  // --- Stage flow -----------------------------------------------------------
  // PUT /crm/universities/{uniId}/application-stage-flow is an idempotent full
  // replace: every stage must be sent with stageId, displayOrder and isEnabled.
  const openStageEditor = () => {
    setStageDraft(
      [...(university.stageFlow ?? [])]
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((s) => ({ ...s })),
    );
    setStageError('');
    setShowStageEdit(true);
  };

  const moveStage = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= stageDraft.length) return;
    const next = [...stageDraft];
    [next[index], next[target]] = [next[target], next[index]];
    setStageDraft(next);
  };

  const toggleStage = (index) => {
    setStageDraft((prev) => prev.map((s, i) => (i === index ? { ...s, isEnabled: !s.isEnabled } : s)));
  };

  const saveStageFlow = async () => {
    if (!stageDraft.some((s) => s.isEnabled)) {
      setStageError('At least one stage must stay enabled.');
      return;
    }
    setStageSaving(true);
    setStageError('');
    try {
      // displayOrder is 1-based and derived from the list order shown.
      await crmUniversityService.replaceStageFlow(id, stageDraft.map((s, i) => ({
        stageId: s.stageId,
        displayOrder: i + 1,
        isEnabled: !!s.isEnabled,
      })));
      setShowStageEdit(false);
      await load();
    } catch (err) {
      console.error('Failed to update stage flow:', err);
      setStageError(err.message || 'Failed to update the stage flow.');
    } finally {
      setStageSaving(false);
    }
  };

  const clearSaveErrors = () => {
    setSaveError('');
    setFieldErrors({});
    setOtherSaveErrors([]);
  };

  const closeEdit = () => {
    setShowEdit(false);
    clearSaveErrors();
  };

  // Editing a field clears the server's complaint about it.
  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
  };

  const loadGeoLists = async (countryId, stateId) => {
    const requestId = ++geoRequest.current;
    setGeoLoading(true);
    try {
      const [countries, states, cities] = await Promise.all([
        crmUniversityService.listCountries(),
        countryId ? crmUniversityService.listStates(countryId) : Promise.resolve([]),
        stateId ? crmUniversityService.listCities(stateId) : Promise.resolve([]),
      ]);
      if (requestId !== geoRequest.current) return;
      setGeoOptions({ countries, states, cities });
    } catch (err) {
      if (requestId !== geoRequest.current) return;
      setSaveError(err.message || 'Could not load countries, states, and cities.');
    } finally {
      if (requestId === geoRequest.current) setGeoLoading(false);
    }
  };

  const changeCountry = async (countryId) => {
    setForm((prev) => ({ ...prev, countryId, stateId: '', cityId: '' }));
    setFieldErrors((prev) => ({ ...prev, sysCountryId: '', sysStateId: '', sysCityId: '' }));
    setGeoOptions((prev) => ({ ...prev, states: [], cities: [] }));
    const requestId = ++geoRequest.current;
    if (!countryId) {
      setGeoLoading(false);
      return;
    }
    setGeoLoading(true);
    try {
      const states = await crmUniversityService.listStates(countryId);
      if (requestId !== geoRequest.current) return;
      setGeoOptions((prev) => ({ ...prev, states, cities: [] }));
    } catch (err) {
      if (requestId !== geoRequest.current) return;
      setSaveError(err.message || 'Could not load states.');
    } finally {
      if (requestId === geoRequest.current) setGeoLoading(false);
    }
  };

  const changeState = async (stateId) => {
    setForm((prev) => ({ ...prev, stateId, cityId: '' }));
    setFieldErrors((prev) => ({ ...prev, sysStateId: '', sysCityId: '' }));
    setGeoOptions((prev) => ({ ...prev, cities: [] }));
    const requestId = ++geoRequest.current;
    if (!stateId) {
      setGeoLoading(false);
      return;
    }
    setGeoLoading(true);
    try {
      const cities = await crmUniversityService.listCities(stateId);
      if (requestId !== geoRequest.current) return;
      setGeoOptions((prev) => ({ ...prev, cities }));
    } catch (err) {
      if (requestId !== geoRequest.current) return;
      setSaveError(err.message || 'Could not load cities.');
    } finally {
      if (requestId === geoRequest.current) setGeoLoading(false);
    }
  };

  const openEdit = () => {
    clearSaveErrors();
    const loc = university.location ?? {};
    if (!university.isPublished) {
      setForm((prev) => ({
        ...prev,
        countryId: loc.countryId ?? '',
        stateId: loc.stateId ?? '',
        cityId: loc.cityId ?? '',
      }));
      loadGeoLists(loc.countryId || '', loc.stateId || '');
    }
    setShowEdit(true);
  };

  const save = async () => {
    setSaving(true);
    clearSaveErrors();
    try {
      const patch = {};
      const errors = {};
      if (!university.isPublished && form.uniName && form.uniName !== university.uniName) {
        patch.uniName = form.uniName;
      }
      if (university.isPublished) {
        if (!String(form.website ?? '').trim()) errors.website = 'A published university must keep a website.';
        if (String(form.establishedYear ?? '').trim() === '') errors.establishedYear = 'A published university must keep an established year.';
        if (!String(form.universityType ?? '').trim()) errors.universityType = 'A published university must keep a type.';
        if (!String(form.address ?? '').trim()) errors.address = 'A published university must keep an address.';
        if (!String(form.aboutUs ?? '').trim()) errors.aboutUs = 'A published university must keep an about section.';
        if (String(form.currRanking ?? '').trim() === '') errors.currRanking = 'A published university must keep a ranking.';
      }
      if (!errors.website && form.website !== (university.website ?? '')) patch.website = form.website || null;
      if (!errors.establishedYear && String(form.establishedYear) !== String(university.establishedYear ?? '')) {
        patch.establishedYear = form.establishedYear === '' ? null : Number(form.establishedYear);
      }
      if (!errors.universityType && form.universityType !== (university.universityType ?? '')) patch.universityType = form.universityType || null;
      if (!errors.address && form.address !== (university.location?.address ?? '')) patch.address = form.address || null;
      if (!errors.aboutUs && form.aboutUs !== (university.aboutUs ?? []).join('\n\n')) patch.aboutUs = form.aboutUs || null;
      if (!errors.currRanking && String(form.currRanking) !== String(university.ranking?.position ?? '')) {
        patch.currRanking = form.currRanking === '' ? null : Number(form.currRanking);
      }
      if (!university.isPublished) {
        const countryId = form.countryId || null;
        const stateId = form.stateId || null;
        const cityId = form.cityId || null;
        const current = university.location ?? {};
        if (!countryId) errors.sysCountryId = 'Choose a country.';
        if (cityId && !stateId) errors.sysStateId = 'Choose a state for this city.';
        const geoChanged = countryId !== (current.countryId ?? null)
          || stateId !== (current.stateId ?? null)
          || cityId !== (current.cityId ?? null);
        if (geoChanged && !errors.sysCountryId && !errors.sysStateId) {
          patch.sysCountryId = countryId;
          patch.sysStateId = stateId;
          patch.sysCityId = cityId;
        }
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      if (Object.keys(patch).length === 0) { setShowEdit(false); return; }

      await crmUniversityService.update(id, patch);
      setShowEdit(false);
      await load();
    } catch (err) {
      console.error('Failed to update university:', err);
      // 400s can carry per-field messages, e.g. "Required fields cannot be
      // cleared on a published item". Messages for fields this form does not
      // show are listed under the alert.
      const { fieldErrors: byField, otherErrors } = splitFieldErrors(err.details, EDIT_FIELDS);
      setFieldErrors(byField);
      setOtherSaveErrors(otherErrors);
      setSaveError(err.message || 'Failed to update this university.');
    } finally {
      setSaving(false);
    }
  };

  // --- Section editors (ADMIN) -------------------------------------------------
  // Campus Life, Location and Commission. Each sends only its own fields, and
  // only the ones that changed.
  const openSection = (name) => {
    const videos = university.campusLifeVideos ?? [];
    setSectionForm({
      campus: { links: videos.length ? [...videos] : [''] },
      location: {
        address: university.location?.address ?? '',
        mapLink: university.location?.coordinates?.link ?? '',
      },
      commission: {
        commission: university.commission?.value ?? '',
        commissionType: university.commission?.type ?? 'PERCENTAGE',
      },
      cover: { coverImageUrl: university.coverImageUrl ?? '' },
      logo: { logoUrl: university.logoUrl ?? '' },
    }[name]);
    setSectionError('');
    setSectionFieldErrors({});
    setSection(name);
  };

  const closeSection = () => {
    setSection(null);
    setSectionError('');
    setSectionFieldErrors({});
  };

  // `errorKey` is the request field whose server complaint the change answers.
  const setSectionField = (name, value, errorKey = name) => {
    setSectionForm((prev) => ({ ...prev, [name]: value }));
    setSectionFieldErrors((prev) => (prev[errorKey] ? { ...prev, [errorKey]: '' } : prev));
  };

  const setCampusLink = (index, value) => {
    setSectionField('links', sectionForm.links.map((l, i) => (i === index ? value : l)), 'campusLifeLinks');
  };

  // Returns the PATCH body for the open section, plus what is wrong with the
  // form, keyed by request field.
  const buildSectionPatch = () => {
    const patch = {};
    const errors = {};

    if (section === 'campus') {
      const links = [...new Set(sectionForm.links.map((l) => l.trim()).filter(Boolean))];
      // The backend stores the links comma-separated, so a comma inside one
      // would split it in two.
      const bad = links.find((l) => !isHttpUrl(l) || l.includes(','));
      if (university.isPublished && links.length === 0) {
        errors.campusLifeLinks = 'A published university must keep at least one campus life link.';
      } else if (bad) {
        errors.campusLifeLinks = `"${bad}" cannot be used. A link must start with http:// or https:// and cannot contain a comma.`;
      } else if (links.join('\n') !== (university.campusLifeVideos ?? []).join('\n')) {
        patch.campusLifeLinks = links.length ? links : null;
      }
    }

    if (section === 'cover' || section === 'logo') {
      const field = section === 'logo' ? 'logoUrl' : 'coverImageUrl';
      const url = (sectionForm[field] ?? '').trim();
      const current = university[field] ?? '';
      if (url && !isHttpUrl(url)) {
        errors[field] = 'Enter a full link starting with http:// or https://.';
      } else if (!url && university.isPublished) {
        errors[field] = section === 'logo'
          ? 'A published university must keep a logo.'
          : 'A published university must keep a cover image.';
      } else if (url !== current) {
        patch[field] = url || null;
      }
    }

    if (section === 'location') {
      const address = sectionForm.address.trim();
      const mapLink = sectionForm.mapLink.trim();
      if (university.isPublished && !address) {
        errors.address = 'A published university must keep an address.';
      }
      if (mapLink && !isHttpUrl(mapLink)) {
        errors.locationMapMetaData = 'Enter a full link starting with http:// or https://.';
      } else if (university.isPublished && !mapLink) {
        errors.locationMapMetaData = 'A published university must keep a map link.';
      }
      if (!errors.address && address !== (university.location?.address ?? '')) patch.address = address || null;
      if (!errors.locationMapMetaData && mapLink !== (university.location?.coordinates?.link ?? '')) {
        patch.locationMapMetaData = locationMapValue(mapLink);
      }
    }

    if (section === 'commission') {
      const value = String(sectionForm.commission).trim();
      const type = sectionForm.commissionType;
      const current = university.commission ?? {};
      if (value === '') {
        // The backend refuses to clear it once the university is live.
        if (university.isPublished) {
          errors.commission = 'A published university must keep a commission.';
        } else if (current.value != null) {
          patch.commission = null;
          patch.commissionType = null;
        }
      } else if (!/^\d{1,8}(\.\d{1,2})?$/.test(value)) {
        errors.commission = 'Enter a number with up to 2 decimal places.';
      } else if (!type) {
        errors.commissionType = 'Choose a type.';
      } else if (type === 'PERCENTAGE' && Number(value) > 100) {
        errors.commission = 'A percentage cannot be more than 100.';
      } else if (current.value == null || Number(value) !== Number(current.value) || type !== current.type) {
        // The two must always be sent together.
        patch.commission = value;
        patch.commissionType = type;
      }
    }

    return { patch, errors };
  };

  const uploadAssetFile = async (file) => {
    const kind = section === 'logo' ? 'logo' : 'cover';
    if (!ASSET_TYPES.includes(file.type)) {
      setSectionError('Use a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size < 1 || file.size > ASSET_MAX_BYTES) {
      setSectionError('Image must be 5 MB or smaller.');
      return;
    }

    setAssetUploading(true);
    setSectionError('');
    try {
      const result = await crmUniversityService.uploadAsset(id, kind, file);
      const field = kind === 'logo' ? 'logoUrl' : 'coverImageUrl';
      const url = result?.[field] ?? '';
      setSectionField(field, url);
      setUniversity((prev) => (prev ? { ...prev, [field]: url || null } : prev));
      if (kind === 'cover') setCoverFailed(false);
      toast.success(kind === 'logo' ? 'Logo updated.' : 'Cover image updated.');
    } catch (err) {
      console.error('Failed to upload university image:', err);
      setSectionError(err.message || 'Failed to upload this image.');
    } finally {
      setAssetUploading(false);
    }
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
      await crmUniversityService.update(id, patch);
      closeSection();
      toast.success('University updated.');
      await load();
    } catch (err) {
      console.error('Failed to update university:', err);
      const { fieldErrors: byField, otherErrors } = splitFieldErrors(err.details, SECTION_FIELDS[section]);
      setSectionFieldErrors(byField);
      setSectionError([err.message || 'Failed to update this university.', ...otherErrors].join(' '));
    } finally {
      setSectionSaving(false);
    }
  };

  // --- Draft actions (ADMIN) ---------------------------------------------------
  // DELETE /crm/universities/{uniId} only works for a draft that was never
  // published and has no courses left.
  const deleteDraft = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await crmUniversityService.deleteDraft(id);
      toast.success('Draft university deleted.');
      navigate(backTo, { replace: true });
    } catch (err) {
      console.error('Failed to delete draft university:', err);
      const message = err.message || 'Failed to delete this university.';
      // 409 "Delete its courses first": say how.
      setDeleteError(err.statusCode === 409 && /courses/i.test(message)
        ? `${message.replace(/\.$/, '')}. Open its courses and delete the drafts, or discard the course import they came from, then try again.`
        : message);
    } finally {
      setDeleting(false);
    }
  };

  const viewCourses = () => {
    const query = new URLSearchParams({ uniId: id });
    // Course search shows published courses only unless told otherwise, which
    // would hide the draft courses an admin is here to review.
    if (isAdmin && university && !university.isPublished) query.set('publishStatus', 'ALL');
    navigate(`/courses?${query}`, { state: { uniName: university?.uniName } });
  };

  // --- Ranking info (meta) ---------------------------------------------------
  // meta[infoKey] is read-only display data; the same infoKey is also the field
  // name PATCH /crm/universities/{uniId} expects (e.g. "rankingMetaData"), so
  // save can stay generic instead of special-casing each info section.
  const closeMeta = () => {
    setOpenMeta(null);
    setMetaEditing(false);
    setMetaSaveError('');
  };

  const openMetaEditor = () => {
    setMetaDraft((openMeta?.information ?? []).map((b) => ({
      subtitle: b.subtitle ?? '',
      description: (b.description ?? []).length ? [...b.description] : [''],
    })));
    setMetaSaveError('');
    setMetaEditing(true);
  };

  const updateMetaBlock = (index, patch) => {
    setMetaDraft((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  };

  // const addMetaBlock = () => setMetaDraft((prev) => [...prev, { subtitle: '', description: [''] }]);

  // const removeMetaBlock = (index) => setMetaDraft((prev) => prev.filter((_, i) => i !== index));

  const saveMeta = async () => {
    if (!openMeta?.infoKey) return;
    setMetaSaving(true);
    setMetaSaveError('');
    try {
      const cleaned = metaDraft
        .map((b) => ({
          subtitle: (b.subtitle ?? '').trim(),
          description: (b.description ?? []).map((d) => d.trim()).filter(Boolean),
        }))
        .filter((b) => b.subtitle || b.description.length);
      if (university?.isPublished && openMeta.infoKey === 'rankingMetaData' && cleaned.length === 0) {
        setMetaSaveError('A published university must keep ranking information.');
        return;
      }
      await crmUniversityService.update(id, { [openMeta.infoKey]: cleaned.length ? cleaned : null });
      closeMeta();
      await load();
    } catch (err) {
      console.error('Failed to update ranking info:', err);
      setMetaSaveError(err.message || 'Failed to update this info.');
    } finally {
      setMetaSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: colors.textSecondary }}>Loading university...</div>;
  }

  if (!university) {
    return (
      <div style={{ maxWidth: '560px', margin: '40px auto', textAlign: 'center' }}>
        <h2 style={{ color: colors.textPrimary }}>University not found</h2>
        {error && <Alert variant="error" style={{ textAlign: 'left', marginTop: '16px' }}>{error}</Alert>}
        <Button onClick={() => navigate(backTo)} style={{ marginTop: '16px' }}>
          {backLabelFor(backTo, 'Back to Universities')}
        </Button>
      </div>
    );
  }

  const isDraft = !university.isPublished;
  // The backend refuses to delete anything that has ever been live.
  const canDelete = isDraft && university.publishedAt == null;

  const loc = university.location ?? {};
  // address often already contains the city/country, so de-duplicate the parts
  // rather than repeating them ("Toronto, Canada, Toronto, British Columbia, Canada").
  const locationLine = (() => {
    const parts = [];
    for (const part of [loc.address, loc.city, loc.state, loc.country]) {
      if (!part) continue;
      for (const piece of String(part).split(",").map((x) => x.trim())) {
        if (piece && !parts.some((e) => e.toLowerCase() === piece.toLowerCase())) parts.push(piece);
      }
    }
    return parts.join(", ");
  })();
  // The Location card mirrors the student web app's course page: the address
  // as text, then a Google map of that same address.
  const addressText = loc.address || locationLine;
  const videos = university.campusLifeVideos ?? [];
  const hasCommission = university.commission?.value != null;

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
        <ArrowLeft size={18} /> {backLabelFor(backTo, 'Back to Universities')}
      </button>

      <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert>

      {/* Header */}
      <Card padding="0" style={{ overflow: 'hidden', marginBottom: '24px' }}>
        {/* Like the student web app, the whole image is shown at its own shape
            instead of being cropped to a fixed band. */}
        <div style={{
          position: 'relative', backgroundColor: colors.appBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: university.coverImageUrl && !coverFailed ? undefined : '140px',
        }}>
          {university.coverImageUrl && !coverFailed ? (
            <img
              src={university.coverImageUrl}
              alt=""
              style={{
                display: 'block', width: '100%', height: 'auto',
                maxHeight: isMobile ? '320px' : '540px', objectFit: 'contain',
              }}
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <span style={{ fontSize: '14px', color: colors.textSecondary }}>
              {university.coverImageUrl ? 'The cover image could not be loaded.' : 'No cover image.'}
            </span>
          )}
          {isAdmin && (
            <Button
              variant="secondary" size="small" icon={Edit2} onClick={() => openSection('cover')}
              style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: colors.contentSurface }}
            >
              Change cover
            </Button>
          )}
        </div>

        <div style={{ padding: isMobile ? '20px' : '24px 32px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', gap: '16px',
            flexWrap: 'wrap',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'flex-start',
          }}>
            <div style={{ flex: '1 1 320px', minWidth: isMobile ? 0 : 280 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', flexShrink: 0 }}>
                  {university.logoUrl && (
                    <img
                      src={university.logoUrl}
                      alt=""
                      style={{ height: '38px', objectFit: 'contain' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  {isAdmin && (
                    <Button
                      variant="secondary"
                      size="small"
                      icon={Edit2}
                      onClick={() => openSection('logo')}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      Change logo
                    </Button>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', minWidth: 160, flex: '1 1 auto' }}>
                  <h1 style={{ margin: 0, fontSize: isMobile ? '20px' : '26px', color: colors.textPrimary }}>
                    {university.uniName}
                  </h1>
                  {isDraft && <DraftBadge size="medium" />}
                </div>
              </div>

              {(isDraft || (isAdmin && university.importBatchId)) && (
                <div style={{ marginBottom: '10px', fontSize: '13px', color: colors.textSecondary }}>
                  {isDraft && 'Not published yet, so students cannot see this university. '}
                  {/* Bulk Imports is an ADMIN-only screen. */}
                  {isAdmin && university.importBatchId && (
                    <Link
                      to={`/bulk-imports/${university.importBatchId}`}
                      style={{ color: colors.brandPrimary, fontWeight: '500', textDecoration: 'underline' }}
                    >
                      View the import it came from
                    </Link>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {university.ranking?.position != null && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', color: colors.brandPrimary, fontWeight: '700' }}>
                    #{university.ranking.position}
                    {university.meta?.[university.ranking.infoKey] && (
                      <button
                        type="button"
                        onClick={() => { setOpenMeta(university.meta[university.ranking.infoKey]); setMetaEditing(false); }}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: colors.brandPrimary, padding: 0, lineHeight: 0, marginLeft: '6px' }}
                        aria-label="Ranking details"
                      >
                        <Info size={14} />
                      </button>
                    )}
                  </span>
                )}
                {university.establishedYear && <Badge size="small">Estd. {university.establishedYear}</Badge>}
                {university.universityType && <Badge size="small">{String(university.universityType).toUpperCase()}</Badge>}
                {locationLine && <Badge variant="info" size="small">{locationLine}</Badge>}
              </div>

              {university.website && (
                <a
                  href={university.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '12px', color: colors.brandPrimary, fontSize: '14px' }}
                >
                  <Globe size={14} /> {university.website}
                </a>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flexShrink: 0, justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
              <Button icon={BookOpen} variant="secondary" onClick={viewCourses}>
                View courses
              </Button>
              {isAdmin && (
                <Button icon={Edit2} variant="secondary" onClick={openEdit}>
                  Edit
                </Button>
              )}
              {isAdmin && canDelete && (
                <Button icon={Trash2} variant="secondary" onClick={() => { setDeleteError(''); setShowDelete(true); }}>
                  Delete draft
                </Button>
              )}
              {isAdmin && isDraft && (
                <Button icon={Send} onClick={() => setShowPublish(true)}>
                  Publish university
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px', marginBottom: '24px',
      }}>
        <Card padding="20px">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <GraduationCap size={20} style={{ color: colors.brandPrimary }} />
            <div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: colors.textPrimary }}>{university.totalCourses}</div>
              <div style={{ fontSize: '12px', color: colors.textSecondary }}>Total Courses</div>
            </div>
          </div>
        </Card>
        <Card padding="20px">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CalendarRange size={20} style={{ color: colors.info }} />
            <div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: colors.textPrimary }}>{university.activeIntakes?.count ?? 0}</div>
              <div style={{ fontSize: '12px', color: colors.textSecondary }}>Active Intakes</div>
            </div>
          </div>
        </Card>
        {/* Admins always get the card so a missing commission can be added. */}
        {(hasCommission || isAdmin) && (
          <Card padding="20px">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: hasCommission ? colors.textPrimary : colors.textSecondary }}>
                  {hasCommission
                    ? `${university.commission.value}${university.commission.type === 'PERCENTAGE' ? '%' : ''}`
                    : 'Not set'}
                </div>
                <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                  Commission{hasCommission && university.commission.type === 'AMOUNT' ? ' (fixed amount)' : ''}
                </div>
              </div>
              {isAdmin && (
                <Button
                  variant="ghost" size="small" icon={Edit2} aria-label="Edit commission"
                  style={{ padding: '6px' }} onClick={() => openSection('commission')}
                />
              )}
            </div>
          </Card>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card title="About">
            {(university.aboutUs ?? []).length
              ? university.aboutUs.map((p, i) => (
                <p key={i} style={{ margin: '0 0 12px', color: colors.textSecondary, lineHeight: 1.7 }}>{p}</p>
              ))
              : <p style={{ color: colors.textSecondary }}>No description available.</p>}
          </Card>

          {(videos.length > 0 || isAdmin) && (
            <Card
              title="Campus Life"
              headerAction={isAdmin ? (
                <Button variant="ghost" size="small" icon={Edit2} onClick={() => openSection('campus')}>
                  Edit
                </Button>
              ) : undefined}
            >
              {videos.length === 0 && (
                <p style={{ margin: 0, color: colors.textSecondary }}>No campus videos yet.</p>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                {videos.map((url) => {
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
                        <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '20px', color: colors.brandPrimary }}>
                          Watch video
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <Card
            title="Location"
            headerAction={isAdmin ? (
              <Button variant="ghost" size="small" icon={Edit2} onClick={() => openSection('location')}>
                Edit
              </Button>
            ) : undefined}
          >
            <p style={{ margin: 0, color: addressText ? colors.textPrimary : colors.textSecondary }}>
              {addressText || 'Not specified'}
            </p>
            {mapEmbedSrc(loc.coordinates?.link) && (
              <iframe
                title="Map"
                src={mapEmbedSrc(loc.coordinates?.link)}
                loading="lazy"
                style={{
                  width: '100%', height: isMobile ? '160px' : '256px', marginTop: '12px',
                  border: 'none', borderRadius: '16px', display: 'block',
                }}
              />
            )}
            {loc.coordinates?.link && (
              <a
                href={loc.coordinates.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '12px', color: colors.brandPrimary, fontSize: '14px', fontWeight: '500' }}
              >
                <ExternalLink size={14} /> Open in Maps
              </a>
            )}
          </Card>

          {(university.stageFlow ?? []).length > 0 && (
            <Card
              title="Application Stage Flow"
              headerAction={isAdmin ? (
                <Button variant="ghost" size="small" icon={Edit2} onClick={openStageEditor}>
                  Reorder
                </Button>
              ) : undefined}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[...university.stageFlow].sort((a, b) => a.displayOrder - b.displayOrder).map((st) => (
                  <div
                    key={st.stageId}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: '12px', padding: '10px 14px', borderRadius: '8px',
                      backgroundColor: colors.appBg, opacity: st.isEnabled ? 1 : 0.55,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span style={{
                        width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                        backgroundColor: colors.brandPrimary, color: '#fff', fontSize: '11px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600',
                      }}>
                        {st.displayOrder}
                      </span>
                      <span style={{ color: colors.textPrimary, fontSize: '14px' }}>
                        {st.stageName || st.stageCode}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                      {(st.requiredDocuments ?? []).length > 0 && (
                        <Badge size="small">{st.requiredDocuments.length} doc{st.requiredDocuments.length === 1 ? '' : 's'}</Badge>
                      )}
                      {!st.isEnabled && <Badge variant="default" size="small">Disabled</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card title="Details">
            <Row label="Established" value={university.establishedYear} />
            <Row label="Type" value={university.universityType} />
            <Row label="Ranking" value={university.ranking?.position != null ? `#${university.ranking.position}` : null} />
            <Row label="Total Courses" value={university.totalCourses} />
          </Card>

          {(university.activeIntakes?.items ?? []).length > 0 && (
            <Card title="Active Intakes">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {university.activeIntakes.items.map((it, i) => (
                  <Badge key={i} variant="info" size="small">
                    {it.quarter} {it.intakeYear}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {isAdmin && <IntakeFees uniId={id} />}
        </div>
      </div>

      {/* Meta tooltip - editable in place via PATCH /crm/universities/{uniId} */}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {metaDraft.map((block, i) => (
              <div key={i} style={{ border: `1px solid ${colors.borderLight}`, borderRadius: '8px', padding: '12px' }}>
                {/* <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="ghost" size="small" icon={Trash2} onClick={() => removeMetaBlock(i)} aria-label="Remove block" />
                </div> */}
                <Input
                  label="Subtitle"
                  value={block.subtitle}
                  onChange={(e) => updateMetaBlock(i, { subtitle: e.target.value })}
                />
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: colors.textSecondary }}>
                  Description (one line per paragraph)
                </label>
                <textarea
                  value={block.description.join('\n')}
                  onChange={(e) => updateMetaBlock(i, { description: e.target.value.split('\n') })}
                  style={{
                    width: '100%', minHeight: '80px', padding: '8px 10px', borderRadius: '6px',
                    border: `1px solid ${colors.borderLight}`, fontSize: '13px', fontFamily: 'inherit',
                    resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
            {/* <Button variant="ghost" size="small" icon={Plus} onClick={addMetaBlock}>Add block</Button> */}
          </div>
        ) : (
          <>
            {(openMeta?.information ?? []).map((block, i) => (
              <div key={i} style={{ marginBottom: '16px' }}>
                {block.subtitle && <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: colors.textPrimary }}>{block.subtitle}</h4>}
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

      {/* Stage flow — PUT /crm/universities/{uniId}/application-stage-flow.
          Full replace, so the whole ordered list is submitted each time. */}
      <Modal
        isOpen={showStageEdit}
        onClose={() => { setShowStageEdit(false); setStageError(''); }}
        title="Application Stage Flow"
        size="medium"
        footer={(
          <>
            <Button variant="ghost" onClick={() => { setShowStageEdit(false); setStageError(''); }}>
              Cancel
            </Button>
            <Button onClick={saveStageFlow} disabled={stageSaving}>
              {stageSaving ? 'Saving...' : 'Save order'}
            </Button>
          </>
        )}
      >
        <Alert variant="error" onDismiss={() => setStageError('')}>{stageError}</Alert>
        <Alert variant="info">This sets display order only — it does not change the live workflow.</Alert>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          {stageDraft.map((st, i) => (
            <div
              key={st.stageId}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 12px', borderRadius: '8px',
                backgroundColor: colors.appBg,
                border: `1px solid ${colors.borderLight}`,
                opacity: st.isEnabled ? 1 : 0.55,
              }}
            >
              <span style={{
                width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                backgroundColor: colors.brandPrimary, color: '#fff', fontSize: '11px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600',
              }}>
                {i + 1}
              </span>
              <span style={{ flex: 1, minWidth: 0, color: colors.textPrimary, fontSize: '14px' }}>
                {st.stageName || st.stageCode}
                {(st.requiredDocuments ?? []).length > 0 && (
                  <span style={{ marginLeft: '8px', fontSize: '12px', color: colors.textSecondary }}>
                    {' · '}{st.requiredDocuments.length} doc{st.requiredDocuments.length === 1 ? '' : 's'}
                  </span>
                )}
              </span>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: colors.textSecondary, cursor: 'pointer', flexShrink: 0 }}>
                <input type="checkbox" checked={!!st.isEnabled} onChange={() => toggleStage(i)} />
                Enabled
              </label>

              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <Button variant="ghost" size="small" disabled={i === 0} onClick={() => moveStage(i, -1)} aria-label="Move up">
                  ↑
                </Button>
                <Button variant="ghost" size="small" disabled={i === stageDraft.length - 1} onClick={() => moveStage(i, 1)} aria-label="Move down">
                  ↓
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Edit — PATCH /crm/universities/{uniId}, ADMIN only */}
      <Modal
        isOpen={showEdit}
        onClose={closeEdit}
        title="Edit University"
        size="medium"
        footer={(
          <>
            <Button variant="ghost" onClick={closeEdit}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
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

        <Input label="University Name" name="uniName" value={form.uniName} error={fieldErrors.uniName}
          disabled={university.isPublished}
          onChange={(e) => setField('uniName', e.target.value)} />
        <Input label="Website" name="website" value={form.website} error={fieldErrors.website}
          onChange={(e) => setField('website', e.target.value)} />

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '12px' }}>
          <Input label="Established Year" name="establishedYear" type="number" value={form.establishedYear}
            error={fieldErrors.establishedYear}
            onChange={(e) => setField('establishedYear', e.target.value)} />
          <Input label="Type" name="universityType" value={form.universityType} error={fieldErrors.universityType}
            onChange={(e) => setField('universityType', e.target.value)} />
          <Input label="Ranking" name="currRanking" type="number" value={form.currRanking} error={fieldErrors.currRanking}
            onChange={(e) => setField('currRanking', e.target.value)} />
        </div>

        <Input label="Address" name="address" value={form.address} error={fieldErrors.address}
          onChange={(e) => setField('address', e.target.value)} />

        {!university.isPublished && (
          <>
            <Select
              label="Country" name="sysCountryId" value={form.countryId ?? ''}
              options={toGeoOptions(geoOptions.countries)}
              placeholder={geoLoading && geoOptions.countries.length === 0 ? 'Loading countries...' : 'Select a country'}
              disabled={geoLoading && geoOptions.countries.length === 0}
              required
              error={fieldErrors.sysCountryId}
              onChange={(e) => changeCountry(e.target.value)}
            />
            <Select
              label="State" name="sysStateId" value={form.stateId ?? ''}
              options={toGeoOptions(geoOptions.states)}
              placeholder={!form.countryId ? 'Select a country first' : 'Select a state'}
              disabled={!form.countryId || geoLoading}
              error={fieldErrors.sysStateId}
              onChange={(e) => changeState(e.target.value)}
            />
            <Select
              label="City" name="sysCityId" value={form.cityId ?? ''}
              options={toGeoOptions(geoOptions.cities)}
              placeholder={!form.stateId ? 'Select a state first' : 'Select a city'}
              disabled={!form.stateId || geoLoading}
              error={fieldErrors.sysCityId}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, cityId: e.target.value }));
                setFieldErrors((prev) => (prev.sysCityId ? { ...prev, sysCityId: '' } : prev));
              }}
            />
          </>
        )}

        <label htmlFor="aboutUs" style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: colors.textPrimary }}>
          About Us
        </label>
        <textarea
          id="aboutUs"
          value={form.aboutUs}
          onChange={(e) => setField('aboutUs', e.target.value)}
          placeholder="Separate paragraphs with a blank line"
          style={{
            width: '100%', minHeight: '130px', padding: '10px 12px', borderRadius: '8px',
            border: `1px solid ${fieldErrors.aboutUs ? colors.error : colors.borderLight}`, fontSize: '14px', fontFamily: 'inherit',
            resize: 'vertical', boxSizing: 'border-box',
          }}
        />
        {fieldErrors.aboutUs && (
          <div style={{ marginTop: '4px', fontSize: '12px', color: colors.error }}>{fieldErrors.aboutUs}</div>
        )}
      </Modal>

      {/* Campus Life / Location / Commission — PATCH /crm/universities/{uniId}, ADMIN only */}
      <Modal
        isOpen={!!section}
        onClose={closeSection}
        title={SECTION_TITLES[section] ?? ''}
        size="medium"
        footer={(
          <>
            <Button variant="ghost" onClick={closeSection}>Cancel</Button>
            <Button onClick={saveSection} disabled={sectionSaving || assetUploading}>{sectionSaving ? 'Saving...' : 'Save'}</Button>
          </>
        )}
      >
        <Alert variant="error" onDismiss={() => setSectionError('')}>{sectionError}</Alert>

        {section === 'cover' && (
          <AssetEditor
            label="Cover image link"
            name="coverImageUrl"
            value={sectionForm.coverImageUrl ?? ''}
            error={sectionFieldErrors.coverImageUrl}
            onChange={(value) => setSectionField('coverImageUrl', value)}
            onFile={uploadAssetFile}
            uploading={assetUploading}
            help={university.isPublished
              ? 'Paste a link, or choose a file. A published university must keep a cover image.'
              : 'Paste a link to an image, or choose a file. Students see the whole picture, not a cropped strip. Leave it empty to remove the cover.'}
          />
        )}

        {section === 'logo' && (
          <AssetEditor
            label="Logo link"
            name="logoUrl"
            value={sectionForm.logoUrl ?? ''}
            error={sectionFieldErrors.logoUrl}
            onChange={(value) => setSectionField('logoUrl', value)}
            onFile={uploadAssetFile}
            uploading={assetUploading}
            help={university.isPublished
              ? 'Paste a link, or choose a file. A published university must keep a logo.'
              : 'Paste a link, or choose a file. Leave it empty to remove the logo.'}
          />
        )}

        {section === 'campus' && (
          <>
            {(sectionForm.links ?? []).map((link, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <CampusVideoThumb url={link} />
                <Input
                  aria-label={`Video link ${i + 1}`}
                  value={link}
                  placeholder="https://www.youtube.com/watch?v=..."
                  onChange={(e) => setCampusLink(i, e.target.value)}
                  containerStyle={{ flex: 1, marginBottom: 0 }}
                />
                <Button
                  variant="ghost" size="small" icon={Trash2} aria-label={`Remove video link ${i + 1}`}
                  onClick={() => setSectionField('links', sectionForm.links.filter((_, j) => j !== i), 'campusLifeLinks')}
                />
              </div>
            ))}
            {sectionFieldErrors.campusLifeLinks && (
              <div style={{ marginBottom: '10px', fontSize: '12px', color: colors.error }}>
                {sectionFieldErrors.campusLifeLinks}
              </div>
            )}
            <Button variant="ghost" size="small" icon={Plus} onClick={() => setSectionField('links', [...sectionForm.links, ''], 'campusLifeLinks')}>
              Add video
            </Button>
          </>
        )}

        {section === 'location' && (
          <>
            <Input
              label="Address" name="address" value={sectionForm.address ?? ''} maxLength={500}
              error={sectionFieldErrors.address}
              onChange={(e) => setSectionField('address', e.target.value)}
            />
            <Input
              label="Map link" name="mapLink" value={sectionForm.mapLink ?? ''}
              placeholder="https://maps.google.com/..."
              error={sectionFieldErrors.locationMapMetaData}
              onChange={(e) => setSectionField('mapLink', e.target.value, 'locationMapMetaData')}
            />
            <p style={{ margin: 0, fontSize: '12px', color: colors.textSecondary, lineHeight: 1.6, wordBreak: 'break-word' }}>
              Format example{' '}
              <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}>
                http://maps.google.co.uk/maps?f=q&amp;hl=en&amp;geocode&amp;q=
                <mark style={mapExampleMark}>Birmingham+City+University</mark>
                &amp;ie=UTF8&amp;
                <mark style={mapExampleMark}>ll=52.4831505,-1.8875616</mark>
                &amp;
                <mark style={mapExampleMark}>z=17</mark>
              </span>
            </p>
          </>
        )}

        {section === 'commission' && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
            <Input
              label="Commission" name="commission" inputMode="decimal" value={sectionForm.commission ?? ''}
              placeholder="e.g. 12.5"
              error={sectionFieldErrors.commission}
              onChange={(e) => setSectionField('commission', e.target.value)}
            />
            <Select
              label="Type" name="commissionType" value={sectionForm.commissionType ?? ''}
              options={COMMISSION_TYPES}
              error={sectionFieldErrors.commissionType}
              onChange={(e) => setSectionField('commissionType', e.target.value)}
            />
          </div>
        )}
      </Modal>

      {/* Publish — GET publish-preview, then POST publish. ADMIN, drafts only. */}
      <PublishPreviewDialog
        isOpen={showPublish}
        onClose={() => setShowPublish(false)}
        title="Publish university"
        note="Only the university goes live, with any new country, state or city it needs. Its courses stay drafts until their import is published."
        loadPreview={() => crmUniversityService.publishPreview(id)}
        onPublish={() => crmUniversityService.publish(id)}
        onPublished={(result) => {
          setShowPublish(false);
          const summary = describePublishCounts(result?.counts);
          toast.success(summary ? `Published: ${summary}.` : 'University published.');
          load();
        }}
        onConflict={(err) => {
          // Its state changed under us (e.g. someone else published it).
          setShowPublish(false);
          toast.error(err.message || 'This university can no longer be published.');
          load();
        }}
      />

      {/* Delete draft — DELETE /crm/universities/{uniId}. ADMIN, never-published drafts only. */}
      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={deleteDraft}
        title="Delete draft university"
        confirmLabel="Delete draft"
        busyLabel="Deleting..."
        busy={deleting}
        error={deleteError}
      >
        Delete the draft <strong>{university.uniName}</strong>? This cannot be undone.
        Published data is not affected. A university that still has courses cannot be deleted.
      </ConfirmDialog>
    </div>
  );
};

export default UniversityDetails;
