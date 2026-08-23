import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Edit2, Mail, Phone, MapPin, Calendar, GraduationCap, FileText } from 'lucide-react';
import { Card, Button, Badge, Modal, Input, Select, Alert } from '../../components';
import { leadService, applicationService } from '../../services';
import {
  LEAD_STATUS,
  leadStatusVariant,
  REGISTER_SOURCE,
  GENDER_OPTIONS,
  APPLICATION_STATUS,
  applicationStatusVariant,
  APPLICATION_STAGE,
  applicationStageVariant,
} from '../../services/mappers';
import { colors } from '../../theme';

const statusOptions = LEAD_STATUS.options;
const genderOptions = GENDER_OPTIONS;
const registerSourceOptions = REGISTER_SOURCE.options;

const booleanOptions = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

const LeadDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showEditModal, setShowEditModal] = useState(false);
  const [countries, setCountries] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [academicResults, setAcademicResults] = useState([]);
  const [englishTestResults, setEnglishTestResults] = useState([]);
  const [sharedDocuments, setSharedDocuments] = useState([]);
  const [resultBusyId, setResultBusyId] = useState(null);
  // Academic / English result editors. The backend pre-creates one slot per
  // degree and per test, so these edit a slot rather than adding a row.
  const [editingAcademic, setEditingAcademic] = useState(null);
  const [academicForm, setAcademicForm] = useState({ institute: '', gpa: '', passingDate: '' });
  const [editingEnglish, setEditingEnglish] = useState(null);
  const [englishForm, setEnglishForm] = useState({ overallScore: '', testDate: '', sections: {} });
  const [resultSaveError, setResultSaveError] = useState('');
  const [savingResult, setSavingResult] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    gender: '',
    targetCountryId: '',
    consultantId: '',
    registerSource: '',
    leadStatus: '',
    hasPassedEnglishTest: 'false',
    enrollmentStatus: '',
  });
  const [formBaseline, setFormBaseline] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadLead();
    loadDropdownData();
    loadApplications();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [id]);

  // Prefill strictly from what was loaded - never invent a value. The lead
  // profile endpoint does not return city/gender/source/consultant, so those
  // legitimately stay blank; defaulting them here is what used to overwrite
  // real data on save.
  const populateForm = (data) => {
    const next = {
      fullName: data.fullName || '',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      city: data.city || '',
      gender: data.gender || '',
      targetCountryId: data.targetCountryId || '',
      consultantId: data.consultantId || '',
      registerSource: data.registerSource || '',
      leadStatus: data.status || '',
      hasPassedEnglishTest: data.hasPassedEnglishTest ? 'true' : 'false',
      enrollmentStatus: data.enrollmentStatus || '',
    };
    setFormData(next);
    // Snapshot of exactly what the form was shown, so save can send only the
    // fields the user actually edited.
    setFormBaseline(next);
  };

  // `base` lets a post-save refresh keep the fields the profile endpoint does
  // not return (target country, consultant, source) instead of blanking them.
  const loadLead = async ({ base } = {}) => {
    setError('');
    try {
      // GET /crm/leads/{leadId}/profile returns personal info, academic and
      // English results, shared documents and the application journey - but not
      // city/gender/consultant/country, which only the list DTO carries.
      const profile = await leadService.getProfile(id).catch((e) => {
        console.error('Failed to load lead profile:', e);
        return null;
      });
      if (profile) {
        setAcademicResults(profile.academicResults);
        setEnglishTestResults(profile.englishTestResults);
        setSharedDocuments(profile.sharedDocuments);
      }

      const fromProfile = profile?.personal
        ? {
          id: profile.personal.leadId ?? id,
          fullName: profile.personal.fullName,
          phone: profile.personal.phoneNumber,
          email: profile.personal.email,
          address: profile.personal.address,
          status: profile.personal.leadStatus,
          createdAt: profile.personal.joined,
          targetUniversities: profile.personal.targetUniversities ?? [],
        }
        : null;

      // On first load prefer the richer row handed over by the Leads list;
      // on a refresh after saving, layer fresh profile values over what we
      // already hold. Drop profile keys that came back empty so they cannot
      // wipe a value the list gave us.
      const fallback = base ?? location.state?.lead ?? null;
      let data;
      if (fallback && fromProfile) {
        const defined = Object.fromEntries(
          Object.entries(fromProfile).filter(([, v]) => v !== null && v !== undefined),
        );
        data = { ...fallback, ...defined };
      } else {
        data = fallback ?? fromProfile ?? (await leadService.getById(id));
      }

      setLead(data);
      if (data) populateForm(data);
      else setError('This lead could not be found.');
    } catch (err) {
      console.error('Failed to load lead:', err);
      setError(err.message || 'Failed to load this lead.');
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    setApplicationsLoading(true);
    try {
      setApplications(await applicationService.getByLead(id));
    } catch (err) {
      console.error('Failed to load lead applications:', err);
      setApplications([]);
    } finally {
      setApplicationsLoading(false);
    }
  };

  const loadDropdownData = async () => {
    try {
      const { countries: countryList, consultants: consultantList } = await leadService.getDropdownData();
      setCountries(countryList);
      setConsultants(consultantList);
    } catch (err) {
      console.error('Failed to load lead dropdown data:', err);
      setError(err.message || 'Failed to load country/consultant options.');
    }
  };

  const refreshProfile = async () => {
    const profile = await leadService.getProfile(id);
    setAcademicResults(profile.academicResults);
    setEnglishTestResults(profile.englishTestResults);
    setSharedDocuments(profile.sharedDocuments);
  };

  const toggleAcademicVerified = async (r) => {
    setResultBusyId(r.degreeId);
    setError('');
    try {
      await leadService.setAcademicResultVerified(id, r.degreeId, !r.isVerified);
      await refreshProfile();
    } catch (err) {
      console.error('Failed to change verification:', err);
      setError(err.message || 'Failed to change verification status.');
    } finally { setResultBusyId(null); }
  };

  const removeAcademicResult = async (r) => {
    if (!window.confirm(`Delete the ${r.degreeName} result? This cannot be undone.`)) return;
    setResultBusyId(r.degreeId);
    setError('');
    try {
      await leadService.deleteAcademicResult(id, r.degreeId);
      await refreshProfile();
    } catch (err) {
      console.error('Failed to delete academic result:', err);
      setError(err.message || 'Failed to delete the academic result.');
    } finally { setResultBusyId(null); }
  };

  const toggleEnglishVerified = async (r) => {
    setResultBusyId(r.testId);
    setError('');
    try {
      await leadService.setEnglishTestVerified(id, r.testId, !r.isVerified);
      await refreshProfile();
    } catch (err) {
      console.error('Failed to change verification:', err);
      setError(err.message || 'Failed to change verification status.');
    } finally { setResultBusyId(null); }
  };

  const removeEnglishResult = async (r) => {
    if (!window.confirm(`Delete the ${r.testName} result? This cannot be undone.`)) return;
    setResultBusyId(r.testId);
    setError('');
    try {
      await leadService.deleteEnglishTestResult(id, r.testId);
      await refreshProfile();
    } catch (err) {
      console.error('Failed to delete English test result:', err);
      setError(err.message || 'Failed to delete the test result.');
    } finally { setResultBusyId(null); }
  };

  // --- Academic result editor -----------------------------------------------
  // PUT /crm/leads/{leadId}/academic-results upserts by degreeId, so sending a
  // single entry leaves the other degrees untouched (verified live).
  const openAcademicEditor = (r) => {
    setEditingAcademic(r);
    setAcademicForm({
      institute: r.institute ?? '',
      gpa: r.gpa ?? '',
      passingDate: r.passingDate ? String(r.passingDate).slice(0, 10) : '',
    });
    setResultSaveError('');
  };

  const saveAcademicResult = async () => {
    const scale = editingAcademic?.validation?.gpaScale;
    const gpa = Number(academicForm.gpa);
    if (academicForm.gpa === '' || Number.isNaN(gpa)) {
      setResultSaveError('Enter a GPA.');
      return;
    }
    if (scale && gpa > scale) {
      setResultSaveError(`GPA cannot exceed the ${editingAcademic.degreeName} scale of ${scale}.`);
      return;
    }
    if (gpa < 0) { setResultSaveError('GPA cannot be negative.'); return; }
    if (!academicForm.institute.trim()) { setResultSaveError('Enter the institution.'); return; }
    if (!academicForm.passingDate) { setResultSaveError('Enter the passing date.'); return; }

    setSavingResult(true);
    setResultSaveError('');
    try {
      await leadService.updateAcademicResults(id, [{
        degreeId: editingAcademic.degreeId,
        institute: academicForm.institute.trim(),
        gpa,
        passingDate: academicForm.passingDate,
      }]);
      setEditingAcademic(null);
      await refreshProfile();
    } catch (err) {
      console.error('Failed to save academic result:', err);
      setResultSaveError(err.message || 'Failed to save the academic result.');
    } finally {
      setSavingResult(false);
    }
  };

  // --- English test editor --------------------------------------------------
  // Same upsert behaviour, keyed by testId. If sections are sent at all the
  // backend requires every section ("All section scores are required for …").
  const openEnglishEditor = (r) => {
    setEditingEnglish(r);
    const scores = {};
    (r.validation?.sections ?? r.sections ?? []).forEach((s) => {
      scores[s.id] = r.sections?.find((x) => x.id === s.id)?.score ?? '';
    });
    setEnglishForm({
      overallScore: r.overallScore ?? '',
      testDate: r.testDate ? String(r.testDate).slice(0, 10) : '',
      sections: scores,
    });
    setResultSaveError('');
  };

  const saveEnglishResult = async () => {
    const max = editingEnglish?.validation?.maxScore;
    const overall = Number(englishForm.overallScore);
    if (englishForm.overallScore === '' || Number.isNaN(overall)) {
      setResultSaveError('Enter an overall score.');
      return;
    }
    if (max && overall > max) {
      setResultSaveError(`Overall score cannot exceed ${max} for ${editingEnglish.testName}.`);
      return;
    }
    if (overall < 0) { setResultSaveError('Overall score cannot be negative.'); return; }

    const specs = editingEnglish?.validation?.sections ?? [];
    const entries = specs.map((s) => [s, englishForm.sections[s.id]]);
    const anyFilled = entries.some(([, v]) => v !== '' && v != null);
    if (anyFilled && entries.some(([, v]) => v === '' || v == null)) {
      setResultSaveError('Enter every section score, or leave them all blank.');
      return;
    }
    const bad = entries.find(([s, v]) => v !== '' && v != null && Number(v) > s.maxScore);
    if (bad) {
      setResultSaveError(`${bad[0].name} cannot exceed ${bad[0].maxScore}.`);
      return;
    }

    setSavingResult(true);
    setResultSaveError('');
    try {
      await leadService.updateEnglishTestResults(id, [{
        testId: editingEnglish.testId,
        overallScore: overall,
        ...(englishForm.testDate ? { testDate: englishForm.testDate } : {}),
        ...(anyFilled ? { sections: specs.map((s) => ({ id: s.id, score: Number(englishForm.sections[s.id]) })) } : {}),
      }]);
      setEditingEnglish(null);
      await refreshProfile();
    } catch (err) {
      console.error('Failed to save English test result:', err);
      setResultSaveError(err.message || 'Failed to save the test result.');
    } finally {
      setSavingResult(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Translate saved form fields into the shape the detail header renders,
  // resolving ids to the names held in the dropdown lists.
  const toDisplayFields = (changes) => {
    const out = {};
    if ('fullName' in changes) out.fullName = changes.fullName;
    if ('phone' in changes) out.phone = changes.phone;
    if ('email' in changes) out.email = changes.email;
    if ('address' in changes) out.address = changes.address;
    if ('city' in changes) out.city = changes.city;
    if ('gender' in changes) out.gender = changes.gender;
    if ('registerSource' in changes) out.registerSource = changes.registerSource;
    if ('leadStatus' in changes) out.status = changes.leadStatus;
    if ('enrollmentStatus' in changes) out.enrollmentStatus = changes.enrollmentStatus;
    if ('hasPassedEnglishTest' in changes) out.hasPassedEnglishTest = changes.hasPassedEnglishTest;
    if ('targetCountryId' in changes) {
      out.targetCountryId = changes.targetCountryId;
      out.targetCountry = countries.find((c) => c.id === changes.targetCountryId)?.name ?? null;
    }
    if ('consultantId' in changes) {
      out.consultantId = changes.consultantId;
      out.consultantName = consultants.find((c) => c.id === changes.consultantId)?.name ?? null;
    }
    return out;
  };

  const handleEditLead = async () => {
    if (!validateForm()) return;

    // Send only what actually changed against what the form was shown. Fields
    // the API never returned stay untouched instead of being written blank.
    const changes = {};
    Object.keys(formData).forEach((key) => {
      if (formBaseline && formData[key] === formBaseline[key]) return;
      changes[key] = key === 'hasPassedEnglishTest'
        ? formData[key] === 'true'
        : formData[key];
    });

    if (Object.keys(changes).length === 0) {
      setShowEditModal(false);
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      await leadService.update(id, changes);
      setShowEditModal(false);
      // PUT returns only { success: true }, so apply the edit to what we hold
      // and re-read the profile on top of it, rather than rendering the reply.
      const merged = { ...lead, ...toDisplayFields(changes) };
      setLead(merged);
      await loadLead({ base: merged });
    } catch (err) {
      console.error('Failed to update lead:', err);
      setSaveError(err.message || 'Failed to update lead. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ color: colors.textSecondary }}>Loading lead details...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div style={{ maxWidth: '520px', margin: '40px auto', textAlign: 'center' }}>
        <h2 style={{ color: colors.textPrimary }}>Lead not found</h2>
        {error && <Alert variant="error" style={{ textAlign: 'left', marginTop: '16px' }}>{error}</Alert>}
        <Button onClick={() => navigate('/leads')} style={{ marginTop: '16px' }}>
          Back to Leads
        </Button>
      </div>
    );
  }

  const infoItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 0',
    borderBottom: `1px solid ${colors.borderLight}`,
  };

  const iconContainerStyle = {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: colors.appBg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.textSecondary,
  };

  const labelStyle = {
    fontSize: '12px',
    color: colors.textSecondary,
    marginBottom: '2px',
  };

  const valueStyle = {
    fontSize: '14px',
    color: colors.textPrimary,
    fontWeight: '500',
  };

  return (
    <div>
      {/* Back Button */}
      <button
        onClick={() => navigate('/leads')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'transparent',
          border: 'none',
          color: colors.textSecondary,
          cursor: 'pointer',
          marginBottom: '24px',
          fontSize: '14px',
          fontFamily: 'inherit',
          padding: 0,
        }}
      >
        <ArrowLeft size={18} />
        Back to Leads
      </button>

      <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert>

      {/* Profile Header */}
      <Card style={{ marginBottom: '24px' }} padding="0">
        <div style={{
          padding: isMobile ? '20px' : '32px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'center' : 'flex-start',
          gap: isMobile ? '16px' : '0',
          textAlign: isMobile ? 'center' : 'left',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            gap: isMobile ? '16px' : '20px'
          }}>
            <div
              style={{
                width: isMobile ? '64px' : '80px',
                height: isMobile ? '64px' : '80px',
                borderRadius: '16px',
                backgroundColor: colors.brandPrimary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: '700',
                fontSize: isMobile ? '24px' : '32px',
                flexShrink: 0,
              }}
            >
              {lead.fullName?.charAt(0) || '?'}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: isMobile ? '20px' : '24px', color: colors.textPrimary, fontWeight: '600' }}>
                {lead.fullName}
              </h1>
              <p style={{ margin: '4px 0 12px 0', color: colors.textSecondary, fontSize: '14px' }}>
                {lead.targetCountry || countries.find((c) => c.id === lead.targetCountryId)?.name || 'No target country set'}
              </p>
              <Badge variant={leadStatusVariant(lead.status)} size="large">{LEAD_STATUS.label(lead.status)}</Badge>
            </div>
          </div>
          <Button icon={Edit2} variant="secondary" onClick={() => setShowEditModal(true)} style={{ width: isMobile ? '100%' : 'auto' }}>
            Edit Profile
          </Button>
        </div>
      </Card>

      {/* Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', gap: isMobile ? '16px' : '24px' }}>
        {/* Personal Information */}
        <Card title="Personal Information">
          <div style={infoItemStyle}>
            <div style={iconContainerStyle}>
              <Mail size={18} />
            </div>
            <div>
              <div style={labelStyle}>Email Address</div>
              <div style={valueStyle}>{lead.email || 'Not provided'}</div>
            </div>
          </div>
          <div style={infoItemStyle}>
            <div style={iconContainerStyle}>
              <Phone size={18} />
            </div>
            <div>
              <div style={labelStyle}>Phone Number</div>
              <div style={valueStyle}>{lead.phone || 'Not provided'}</div>
            </div>
          </div>
          <div style={infoItemStyle}>
            <div style={iconContainerStyle}>
              <MapPin size={18} />
            </div>
            <div>
              <div style={labelStyle}>Address</div>
              <div style={valueStyle}>
                {lead.address ? `${lead.address}, ${lead.city || ''}` : 'Not provided'}
              </div>
            </div>
          </div>
          <div style={{ ...infoItemStyle, borderBottom: 'none' }}>
            <div style={iconContainerStyle}>
              <Calendar size={18} />
            </div>
            <div>
              <div style={labelStyle}>Date of Birth</div>
              <div style={valueStyle}>{lead.dob || 'Not provided'}</div>
            </div>
          </div>
        </Card>

        {/* Academic History - GET /crm/leads/{leadId}/profile */}
        <Card title="Academic History">
          {academicResults.length > 0 ? (
            academicResults.map((result, index) => (
              <div
                key={result.degreeId}
                style={{
                  padding: '16px',
                  backgroundColor: colors.appBg,
                  borderRadius: '8px',
                  marginBottom: index < academicResults.length - 1 ? '12px' : 0,
                  opacity: resultBusyId === result.degreeId ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '600', color: colors.textPrimary, marginBottom: '4px' }}>
                      {result.degreeName || 'Unknown Degree'}
                    </div>
                    <div style={{ fontSize: '14px', color: colors.textSecondary }}>
                      {result.institute || 'Institution not recorded'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: colors.brandPrimary }}>
                      {result.gpa ?? '-'}
                      {result.validation?.gpaScale ? (
                        <span style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: '400' }}>
                          {' / '}{result.validation.gpaScale}
                        </span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                      {result.passingDate ? new Date(result.passingDate).getFullYear() : 'N/A'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {result.isVerified && <Badge variant="success" size="small">Verified</Badge>}
                  <Button variant="ghost" size="small" icon={Edit2} disabled={resultBusyId === result.degreeId}
                    onClick={() => openAcademicEditor(result)}>
                    {result.gpa == null ? 'Add result' : 'Edit'}
                  </Button>
                  {/* Verify and Delete only make sense once the slot is filled. */}
                  {result.gpa != null && (
                    <>
                      <Button variant="ghost" size="small" disabled={resultBusyId === result.degreeId}
                        onClick={() => toggleAcademicVerified(result)}>
                        {result.isVerified ? 'Unverify' : 'Verify'}
                      </Button>
                      <Button variant="ghost" size="small" disabled={resultBusyId === result.degreeId}
                        onClick={() => removeAcademicResult(result)}>
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: colors.textSecondary }}>
              <GraduationCap size={40} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <p>No academic records found</p>
            </div>
          )}
        </Card>

        {/* English Test Results */}
        <Card title="English Test Results">
          {englishTestResults.length > 0 ? (
            englishTestResults.map((result, index) => (
              <div
                key={result.testId}
                style={{
                  padding: '16px',
                  backgroundColor: colors.appBg,
                  borderRadius: '8px',
                  marginBottom: index < englishTestResults.length - 1 ? '12px' : 0,
                  opacity: resultBusyId === result.testId ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '600', color: colors.textPrimary, marginBottom: '4px' }}>
                      {result.testName || 'Unknown Test'}
                    </div>
                    <div style={{ fontSize: '14px', color: colors.textSecondary }}>
                      {result.testDate ? new Date(result.testDate).toLocaleDateString() : 'Date not recorded'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: colors.brandPrimary }}>
                      {result.overallScore ?? '-'}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                      / {result.validation?.maxScore ?? '?'}
                    </div>
                  </div>
                </div>
                {(result.sections ?? []).length > 0 && (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {result.sections.map((sec) => (
                      <span key={sec.id ?? sec.name} style={{ fontSize: '12px', color: colors.textSecondary }}>
                        {sec.name}: <strong style={{ color: colors.textPrimary }}>{sec.score ?? '-'}</strong>
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {result.isVerified && <Badge variant="success" size="small">Verified</Badge>}
                  <Button variant="ghost" size="small" icon={Edit2} disabled={resultBusyId === result.testId}
                    onClick={() => openEnglishEditor(result)}>
                    {result.overallScore == null ? 'Add result' : 'Edit'}
                  </Button>
                  {result.overallScore != null && (
                    <>
                      <Button variant="ghost" size="small" disabled={resultBusyId === result.testId}
                        onClick={() => toggleEnglishVerified(result)}>
                        {result.isVerified ? 'Unverify' : 'Verify'}
                      </Button>
                      <Button variant="ghost" size="small" disabled={resultBusyId === result.testId}
                        onClick={() => removeEnglishResult(result)}>
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: colors.textSecondary }}>
              <FileText size={40} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <p>No test results found</p>
            </div>
          )}
        </Card>

        {/* Documents shared across this lead’s applications */}
        {sharedDocuments.length > 0 && (
          <Card title="Shared Documents">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sharedDocuments.map((item, i) => (
                <div key={item.documentType?.documentTypeId ?? i}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '12px', padding: '12px 14px', backgroundColor: colors.appBg, borderRadius: '8px',
                  }}>
                  <span style={{ color: colors.textPrimary, fontSize: '14px' }}>
                    {item.documentType?.documentTypeName ?? 'Document'}
                  </span>
                  <Badge size="small" variant={(item.uploadedDocuments ?? []).length ? 'success' : 'default'}>
                    {(item.uploadedDocuments ?? []).length} file{(item.uploadedDocuments ?? []).length === 1 ? '' : 's'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
        {/* This lead's applications - GET /crm/leads/{leadId}/applications */}
        <Card title="Applications">
          {applicationsLoading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: colors.textSecondary }}>
              Loading applications...
            </div>
          ) : applications.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {applications.map((app) => (
                <button
                  key={app.id}
                  onClick={() => navigate(`/applications/${app.id}`, { state: { leadId: id } })}
                  style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: colors.appBg,
                    border: `1px solid ${colors.borderLight}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '500', color: colors.textPrimary }}>
                      {app.course?.courseName || 'Application'}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                      {app.university?.uniName || '-'}
                      {app.appliedDate ? ` · ${new Date(app.appliedDate).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
                    <Badge variant={applicationStatusVariant(app.status)} size="small">
                      {APPLICATION_STATUS.label(app.status)}
                    </Badge>
                    {app.stage && (
                      <Badge variant={applicationStageVariant(app.stage)} size="small">
                        {APPLICATION_STAGE.label(app.stage)}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: colors.textSecondary }}>
              <FileText size={40} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <p>No applications for this lead yet.</p>
              <Button variant="secondary" size="small" style={{ marginTop: '12px' }} onClick={() => navigate('/applications')}>
                Go to Applications
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Academic result editor - PUT /crm/leads/{leadId}/academic-results.
          The degree list is fixed by the backend, so this fills in a slot
          rather than creating a row. */}
      <Modal
        isOpen={!!editingAcademic}
        onClose={() => { setEditingAcademic(null); setResultSaveError(''); }}
        title={editingAcademic ? `${editingAcademic.degreeName} result` : 'Academic result'}
        size="small"
        footer={(
          <>
            <Button variant="ghost" onClick={() => { setEditingAcademic(null); setResultSaveError(''); }}>
              Cancel
            </Button>
            <Button onClick={saveAcademicResult} disabled={savingResult}>
              {savingResult ? 'Saving...' : 'Save'}
            </Button>
          </>
        )}
      >
        <Alert variant="error" onDismiss={() => setResultSaveError('')}>{resultSaveError}</Alert>
        <Input
          label="Institution"
          value={academicForm.institute}
          onChange={(e) => setAcademicForm((p) => ({ ...p, institute: e.target.value }))}
          placeholder="School, college or university"
          required
        />
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
          <Input
            label={`GPA${editingAcademic?.validation?.gpaScale ? ` (out of ${editingAcademic.validation.gpaScale})` : ''}`}
            type="number"
            step="0.01"
            min="0"
            max={editingAcademic?.validation?.gpaScale ?? undefined}
            value={academicForm.gpa}
            onChange={(e) => setAcademicForm((p) => ({ ...p, gpa: e.target.value }))}
            required
          />
          <Input
            label="Passing date"
            type="date"
            value={academicForm.passingDate}
            onChange={(e) => setAcademicForm((p) => ({ ...p, passingDate: e.target.value }))}
            required
          />
        </div>
      </Modal>

      {/* English test editor - PUT /crm/leads/{leadId}/english-test-results.
          Sections come from validation.sections, which carries each section's
          own maximum. All-or-nothing: the backend rejects a partial set. */}
      <Modal
        isOpen={!!editingEnglish}
        onClose={() => { setEditingEnglish(null); setResultSaveError(''); }}
        title={editingEnglish ? `${editingEnglish.testName} result` : 'English test result'}
        size="small"
        footer={(
          <>
            <Button variant="ghost" onClick={() => { setEditingEnglish(null); setResultSaveError(''); }}>
              Cancel
            </Button>
            <Button onClick={saveEnglishResult} disabled={savingResult}>
              {savingResult ? 'Saving...' : 'Save'}
            </Button>
          </>
        )}
      >
        <Alert variant="error" onDismiss={() => setResultSaveError('')}>{resultSaveError}</Alert>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
          <Input
            label={`Overall score${editingEnglish?.validation?.maxScore ? ` (out of ${editingEnglish.validation.maxScore})` : ''}`}
            type="number"
            step="0.5"
            min="0"
            max={editingEnglish?.validation?.maxScore ?? undefined}
            value={englishForm.overallScore}
            onChange={(e) => setEnglishForm((p) => ({ ...p, overallScore: e.target.value }))}
            required
          />
          <Input
            label="Test date"
            type="date"
            value={englishForm.testDate}
            onChange={(e) => setEnglishForm((p) => ({ ...p, testDate: e.target.value }))}
          />
        </div>

        {(editingEnglish?.validation?.sections ?? []).length > 0 && (
          <>
            <label style={{ display: 'block', margin: '4px 0 8px', fontSize: '14px', fontWeight: '500', color: colors.textPrimary }}>
              Section scores
            </label>
            <p style={{ margin: '0 0 10px', fontSize: '12px', color: colors.textSecondary }}>
              Fill in every section, or leave them all blank.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '10px' }}>
              {editingEnglish.validation.sections.map((sec) => (
                <Input
                  key={sec.id}
                  label={`${sec.name} (${sec.maxScore})`}
                  type="number"
                  step="0.5"
                  min="0"
                  max={sec.maxScore}
                  value={englishForm.sections[sec.id] ?? ''}
                  onChange={(e) => setEnglishForm((p) => ({
                    ...p, sections: { ...p.sections, [sec.id]: e.target.value },
                  }))}
                  containerStyle={{ marginBottom: 0 }}
                />
              ))}
            </div>
          </>
        )}
      </Modal>

      {/* Edit Lead Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSaveError(''); }}
        title="Edit Lead Details"
        size="medium"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowEditModal(false); setSaveError(''); }}>
              Cancel
            </Button>
            <Button onClick={handleEditLead} disabled={saving}>
              {saving ? 'Updating...' : 'Update Lead'}
            </Button>
          </>
        }
      >
        <Alert variant="error" onDismiss={() => setSaveError('')}>{saveError}</Alert>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Input
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              required
              error={errors.fullName}
            />
          </div>
          <Input
            label="Phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            required
            error={errors.phone}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
          />
          <Input
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
          />
          <Input
            label="City"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
          />
          <Select
            label="Gender"
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
            options={genderOptions}
          />
          <Select
            label="Target Country"
            name="targetCountryId"
            value={formData.targetCountryId}
            onChange={handleInputChange}
            options={countries.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Select target country"
          />
          <Select
            label="Consultant"
            name="consultantId"
            value={formData.consultantId}
            onChange={handleInputChange}
            options={consultants.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Select consultant"
          />
          <Select
            label="Register Source"
            name="registerSource"
            value={formData.registerSource}
            onChange={handleInputChange}
            options={registerSourceOptions}
          />
          <Select
            label="English Test Passed"
            name="hasPassedEnglishTest"
            value={formData.hasPassedEnglishTest}
            onChange={handleInputChange}
            options={booleanOptions}
          />
          <Select
            label="Status"
            name="leadStatus"
            value={formData.leadStatus}
            onChange={handleInputChange}
            options={statusOptions}
          />
        </div>
      </Modal>

    </div>
  );
};

export default LeadDetails;
