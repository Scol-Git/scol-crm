import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, MapPin, Edit2, ExternalLink, Info, GraduationCap, CalendarRange, Plus, Trash2 } from 'lucide-react';
import { Card, Button, Badge, Modal, Input, Alert } from '../../components';
import { crmUniversityService } from '../../services';
import { colors } from '../../theme';

// Backed by GET /crm/universities/{uniId}; edits go through
// PATCH /crm/universities/{uniId} (ADMIN only).

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

const UniversityDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

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
  // Stage-flow editor: a working copy of the ordered stage list.
  const [showStageEdit, setShowStageEdit] = useState(false);
  const [stageDraft, setStageDraft] = useState([]);
  const [stageSaving, setStageSaving] = useState(false);
  const [stageError, setStageError] = useState('');
  const [form, setForm] = useState({
    uniName: '', website: '', establishedYear: '', universityType: '',
    address: '', aboutUs: '', currRanking: '',
  });

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
      setForm({
        uniName: data.uniName ?? '',
        website: data.website ?? '',
        establishedYear: data.establishedYear ?? '',
        universityType: data.universityType ?? '',
        address: data.location?.address ?? '',
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

  const save = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const patch = {};
      if (form.uniName && form.uniName !== university.uniName) patch.uniName = form.uniName;
      if (form.website !== (university.website ?? '')) patch.website = form.website || null;
      if (String(form.establishedYear) !== String(university.establishedYear ?? '')) {
        patch.establishedYear = form.establishedYear === '' ? null : Number(form.establishedYear);
      }
      if (form.universityType !== (university.universityType ?? '')) patch.universityType = form.universityType || null;
      if (form.address !== (university.location?.address ?? '')) patch.address = form.address || null;
      if (form.aboutUs !== (university.aboutUs ?? []).join('\n\n')) patch.aboutUs = form.aboutUs || null;
      if (String(form.currRanking) !== String(university.ranking?.position ?? '')) {
        patch.currRanking = form.currRanking === '' ? null : Number(form.currRanking);
      }

      if (Object.keys(patch).length === 0) { setShowEdit(false); return; }

      await crmUniversityService.update(id, patch);
      setShowEdit(false);
      await load();
    } catch (err) {
      console.error('Failed to update university:', err);
      setSaveError(err.message || 'Failed to update this university.');
    } finally {
      setSaving(false);
    }
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
      await crmUniversityService.update(id, { [openMeta.infoKey]: cleaned });
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
        <Button onClick={() => navigate('/courses')} style={{ marginTop: '16px' }}>Back to Courses</Button>
      </div>
    );
  }

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

  return (
    <div>
      <button
        onClick={() => navigate('/courses')}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent',
          border: 'none', color: colors.textSecondary, cursor: 'pointer',
          marginBottom: '20px', fontSize: '14px', fontFamily: 'inherit', padding: 0,
        }}
      >
        <ArrowLeft size={18} /> Back to Courses
      </button>

      <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert>

      {/* Header */}
      <Card padding="0" style={{ overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ height: isMobile ? '150px' : '220px', backgroundColor: colors.appBg, overflow: 'hidden' }}>
          {university.coverImageUrl && (
            <img
              src={university.coverImageUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
        </div>

        <div style={{ padding: isMobile ? '20px' : '24px 32px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', gap: '16px',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'flex-start',
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                {university.logoUrl && (
                  <img
                    src={university.logoUrl}
                    alt=""
                    style={{ height: '38px', objectFit: 'contain' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                <h1 style={{ margin: 0, fontSize: isMobile ? '20px' : '26px', color: colors.textPrimary }}>
                  {university.uniName}
                </h1>
              </div>

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

            <Button icon={Edit2} variant="secondary" onClick={() => setShowEdit(true)} style={{ flexShrink: 0 }}>
              Edit
            </Button>
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
        {university.commission?.value != null && (
          <Card padding="20px">
            <div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: colors.textPrimary }}>
                {university.commission.value}{university.commission.type === 'PERCENTAGE' ? '%' : ''}
              </div>
              <div style={{ fontSize: '12px', color: colors.textSecondary }}>Commission</div>
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

          {(university.campusLifeVideos ?? []).length > 0 && (
            <Card title="Campus Life">
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                {university.campusLifeVideos.map((url) => {
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

          {(university.stageFlow ?? []).length > 0 && (
            <Card
              title="Application Stage Flow"
              headerAction={(
                <Button variant="ghost" size="small" icon={Edit2} onClick={openStageEditor}>
                  Reorder
                </Button>
              )}
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
          <Card title="Location">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: colors.textPrimary, marginBottom: '12px' }}>
              <MapPin size={16} style={{ color: colors.brandPrimary, flexShrink: 0, marginTop: '2px' }} />
              <span>{locationLine || 'Not specified'}</span>
            </div>
            {loc.coordinates?.link && (
              <a
                href={loc.coordinates.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: colors.brandPrimary, fontSize: '14px', fontWeight: '500' }}
              >
                <ExternalLink size={14} /> Open in Maps
              </a>
            )}
          </Card>

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
                {block.subtitle && <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: colors.textPrimary }}>{block.subtitle}</h4>}
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
        <Alert variant="info">Reordering requires an ADMIN role. This sets display order only — it does not change the live workflow.</Alert>

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
        onClose={() => { setShowEdit(false); setSaveError(''); }}
        title="Edit University"
        size="medium"
        footer={(
          <>
            <Button variant="ghost" onClick={() => { setShowEdit(false); setSaveError(''); }}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </>
        )}
      >
        <Alert variant="error" onDismiss={() => setSaveError('')}>{saveError}</Alert>
        <Alert variant="info">Updating a university requires an ADMIN role.</Alert>

        <Input label="University Name" name="uniName" value={form.uniName}
          onChange={(e) => setForm({ ...form, uniName: e.target.value })} />
        <Input label="Website" name="website" value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })} />

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '12px' }}>
          <Input label="Established Year" name="establishedYear" type="number" value={form.establishedYear}
            onChange={(e) => setForm({ ...form, establishedYear: e.target.value })} />
          <Input label="Type" name="universityType" value={form.universityType}
            onChange={(e) => setForm({ ...form, universityType: e.target.value })} />
          <Input label="Ranking" name="currRanking" type="number" value={form.currRanking}
            onChange={(e) => setForm({ ...form, currRanking: e.target.value })} />
        </div>

        <Input label="Address" name="address" value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })} />

        <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: colors.textPrimary }}>
          About Us
        </label>
        <textarea
          value={form.aboutUs}
          onChange={(e) => setForm({ ...form, aboutUs: e.target.value })}
          placeholder="Separate paragraphs with a blank line"
          style={{
            width: '100%', minHeight: '130px', padding: '10px 12px', borderRadius: '8px',
            border: `1px solid ${colors.borderLight}`, fontSize: '14px', fontFamily: 'inherit',
            resize: 'vertical', boxSizing: 'border-box',
          }}
        />
      </Modal>
    </div>
  );
};

export default UniversityDetails;
