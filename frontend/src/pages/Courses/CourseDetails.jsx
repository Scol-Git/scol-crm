import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Edit2, Info, MapPin, ExternalLink, PlayCircle, Plus, Trash2 } from 'lucide-react';
import { Card, Button, Badge, Modal, Input, Alert } from '../../components';
import { courseService } from '../../services/courseService';
import { colors } from '../../theme';

// Renders the tabbed course profile using the live CourseDetailsResponseDto.
// The `tabs` array comes from the backend, so the tab set adapts if it changes.

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

const SectionTitle = ({ children, meta, onOpenMeta }) => (
  <h3 style={{ display: 'flex', alignItems: 'center', margin: '0 0 12px', fontSize: '16px', color: colors.textPrimary }}>
    {children}
    <InfoDot meta={meta} onOpen={onOpenMeta} />
  </h3>
);

const youTubeId = (url = '') => {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  return m ? m[1] : null;
};

const CourseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [course, setCourse] = useState(null);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(null);
  const [openMeta, setOpenMeta] = useState(null);
  const [metaEditing, setMetaEditing] = useState(false);
  const [metaDraft, setMetaDraft] = useState([]);
  const [metaSaving, setMetaSaving] = useState(false);
  const [metaSaveError, setMetaSaveError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Course edit persists via PATCH /crm/courses/{courseId} (ADMIN only).
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ courseName: '', tuitionFee: '', currency: '', courseDuration: '', applicationDeadline: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

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
      const { course: data, meta: metaMap } = await courseService.getById(id);
      setCourse(data);
      setMeta(metaMap);
      setActiveTab(data?.tabs?.[0]?.key ?? null);
      const feeItems = data?.feesAndScholarships?.items ?? {};
      // GET /crm/courses/{id} returns neither courseDuration nor
      // applicationDeadline, so duration falls back to the search row handed
      // over by the Courses list. On a direct URL visit it stays blank - the
      // modal says so rather than showing an empty box that looks current.
      setEditForm({
        courseName: data?.courseName ?? '',
        tuitionFee: feeItems.tuitionFees?.amount ?? '',
        currency: feeItems.tuitionFees?.currency ?? '',
        courseDuration: location.state?.course?.durationMonths ?? '',
        applicationDeadline: '',
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
  const saveEdit = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const patch = {};
      if (editForm.courseName && editForm.courseName !== course.courseName) patch.courseName = editForm.courseName;
      if (editForm.tuitionFee !== '') patch.tuitionFee = String(editForm.tuitionFee);
      if (editForm.currency) patch.currency = editForm.currency;
      if (editForm.courseDuration !== '') patch.courseDuration = Number(editForm.courseDuration);
      if (editForm.applicationDeadline) patch.applicationDeadline = editForm.applicationDeadline;

      if (Object.keys(patch).length === 0) { setShowEdit(false); return; }

      await courseService.update(id, patch);
      setShowEdit(false);
      await load();
    } catch (err) {
      console.error('Failed to update course:', err);
      setSaveError(err.message || 'Failed to update this course.');
    } finally {
      setSaving(false);
    }
  };

  // --- Info dot meta (ranking / requirements / fees / intake) ----------------
  // meta[infoKey]'s infoKey is also the field name PATCH /crm/courses/{id}
  // expects (e.g. "rankingMetaData"), so save can stay generic. The
  // Fees & Scholarships tab only ever opens one infoKey (see line ~365) even
  // though the backend has a separate scholarshipMetaData field - whichever
  // key that tab actually links is what gets edited/saved here.
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

  const addMetaBlock = () => setMetaDraft((prev) => [...prev, { subtitle: '', description: [''] }]);

  const removeMetaBlock = (index) => setMetaDraft((prev) => prev.filter((_, i) => i !== index));

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
      await courseService.update(id, { [openMeta.infoKey]: cleaned });
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
        <Button onClick={() => navigate('/courses')} style={{ marginTop: '16px' }}>Back to Courses</Button>
      </div>
    );
  }

  const uni = course.university ?? {};
  const openMetaModal = (m) => { setOpenMeta(m); setMetaEditing(false); setMetaSaveError(''); };
  const goToUniversity = () => {
    if (!uni.uniId) return;
    navigate(`/universities/${uni.uniId}`, {
      state: {
        university: {
          id: uni.uniId,
          name: uni.uniName,
          logoUrl: uni.uniLogoUrl,
          imgUrl: uni.uniCoverImageUrl,
          country: course.location?.country,
          state: course.location?.state,
          city: course.location?.city,
        },
      },
    });
  };

  const req = course.academicRequirements?.requirements;
  const fees = course.feesAndScholarships?.items;

  return (
    <div>
      <button
        onClick={() => navigate(location.state?.from ?? '/courses')}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent',
          border: 'none', color: colors.textSecondary, cursor: 'pointer',
          marginBottom: '20px', fontSize: '14px', fontFamily: 'inherit', padding: 0,
        }}
      >
        <ArrowLeft size={18} /> Back to Courses
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
              <h1 style={{ margin: '0 0 8px', fontSize: isMobile ? '20px' : '26px', color: colors.textPrimary }}>
                {course.courseName}
              </h1>

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

            <Button icon={Edit2} variant="secondary" onClick={() => setShowEdit(true)} style={{ flexShrink: 0 }}>
              Edit
            </Button>
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
          <SectionTitle meta={meta[course.academicRequirements?.infoKey]} onOpenMeta={openMetaModal}>
            Academic Requirements
          </SectionTitle>
          {course.academicRequirements?.hasInfo && req ? (
            <>
              {(req.degreeRequirements ?? []).map((d, i) => (
                <Row key={`deg-${i}`} label={`${d.degreeName} (${d.label})`} value={d.minValue} />
              ))}
              {(req.englishRequirements ?? []).map((t, i) => (
                <Row
                  key={`eng-${i}`}
                  label={t.testName}
                  value={`${t.minOverallValue}${t.minSectionValue ? ` / ${t.minSectionValue}` : ''}`}
                />
              ))}
            </>
          ) : <p style={{ color: colors.textSecondary }}>No academic requirements published.</p>}
        </Card>
      )}

      {activeTab === 'feesAndScholarships' && (
        <Card>
          <SectionTitle meta={meta[course.feesAndScholarships?.infoKey]} onOpenMeta={openMetaModal}>
            Fees &amp; Scholarships
          </SectionTitle>
          {course.feesAndScholarships?.hasInfo && fees ? (
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Alert variant="info">Updating this requires an ADMIN role.</Alert>
            {metaDraft.map((block, i) => (
              <div key={i} style={{ border: `1px solid ${colors.borderLight}`, borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="ghost" size="small" icon={Trash2} onClick={() => removeMetaBlock(i)} aria-label="Remove block" />
                </div>
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
            <Button variant="ghost" size="small" icon={Plus} onClick={addMetaBlock}>Add block</Button>
          </div>
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
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="small" icon={Edit2} onClick={openMetaEditor}>Edit</Button>
            </div>
          </>
        )}
      </Modal>

      {/* Course edit - PATCH /crm/courses/{id}, ADMIN only */}
      <Modal
        isOpen={showEdit}
        onClose={() => { setShowEdit(false); setSaveError(''); }}
        title="Edit Course"
        size="small"
        footer={(
          <>
            <Button variant="ghost" onClick={() => { setShowEdit(false); setSaveError(''); }}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </>
        )}
      >
        <Alert variant="error" onDismiss={() => setSaveError('')}>{saveError}</Alert>
        <Alert variant="info">Updating a course requires an ADMIN role.</Alert>
        <Input
          label="Course Name"
          name="courseName"
          value={editForm.courseName}
          onChange={(e) => setEditForm({ ...editForm, courseName: e.target.value })}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
          <Input
            label="Tuition Fee"
            name="tuitionFee"
            value={editForm.tuitionFee}
            onChange={(e) => setEditForm({ ...editForm, tuitionFee: e.target.value })}
          />
          <Input
            label="Currency"
            name="currency"
            value={editForm.currency}
            onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input
            label="Duration (months)"
            name="courseDuration"
            type="number"
            value={editForm.courseDuration}
            onChange={(e) => setEditForm({ ...editForm, courseDuration: e.target.value })}
          />
          <Input
            label="Application Deadline"
            name="applicationDeadline"
            type="date"
            value={editForm.applicationDeadline}
            onChange={(e) => setEditForm({ ...editForm, applicationDeadline: e.target.value })}
          />
        </div>
        <p style={{ margin: '-4px 0 0', fontSize: '12px', color: colors.textSecondary }}>
          The application deadline is not returned by the API, so it cannot be shown here.
          Leave a field blank to keep its current value.
        </p>
      </Modal>
    </div>
  );
};

export default CourseDetails;
