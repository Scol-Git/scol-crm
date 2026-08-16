import React, { useEffect, useState } from 'react';
import { Flag, Building2, CalendarRange } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import Alert from './Alert';
import { courseService, MONTHS } from '../services/courseService';
import { colors } from '../theme';

// Mirrors the public site's "Search Universities" panel. Every control maps to
// a documented field on AdvancedSearchRequestDto:
//   country/city/programme -> filters.countryIds / cityIds / programmeIds
//   year + month chips     -> filters.intake { year, fromMonth, toMonth }
//   tuition / duration     -> ranges.tuitionFee / durationMonths { min, max }
//   scholarships           -> flags.hasScholarship
const TUITION_MAX = 50000;
const TUITION_STEP = 1000;
const DURATION_MAX_YEARS = 6;

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i);

const EMPTY = {
  countryId: '',
  cityId: '',
  programmeId: '',
  intakeYear: String(new Date().getFullYear()),
  intakeMonths: [],
  tuitionMax: TUITION_MAX,
  durationMaxYears: 3,
  hasScholarship: null,
};

const AdvancedSearchModal = ({ isOpen, onClose, onSearch, initialValues }) => {
  const [form, setForm] = useState(initialValues ?? EMPTY);
  const [countries, setCountries] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    (async () => {
      try {
        const { countries: c, programmes: p } = await courseService.getFilterOptions();
        setCountries(c);
        setProgrammes(p);
      } catch (err) {
        console.error('Failed to load search filters:', err);
        setError(err.message || 'Could not load country and programme options.');
      }
    })();
  }, [isOpen]);

  // Cities cascade off the selected country.
  useEffect(() => {
    if (!form.countryId) { setCities([]); return; }
    let cancelled = false;
    setCitiesLoading(true);
    (async () => {
      try {
        const list = await courseService.getCities(form.countryId);
        if (!cancelled) setCities(list);
      } catch (err) {
        console.error('Failed to load cities:', err);
        if (!cancelled) setCities([]);
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [form.countryId]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const toggleMonth = (month) => {
    setForm((prev) => ({
      ...prev,
      intakeMonths: prev.intakeMonths.includes(month)
        ? prev.intakeMonths.filter((m) => m !== month)
        : [...prev.intakeMonths, month],
    }));
  };

  const selectStyle = {
    width: '100%',
    padding: '14px 16px',
    fontSize: '14px',
    border: 'none',
    borderRadius: '10px',
    backgroundColor: colors.appBg,
    color: colors.textPrimary,
    outline: 'none',
    appearance: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
  };

  const fieldWrap = { position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '14px' };
  const iconStyle = { position: 'absolute', left: '14px', color: colors.textSecondary, pointerEvents: 'none' };
  const sectionLabel = { fontSize: '13px', fontWeight: '600', color: colors.textSecondary, marginBottom: '10px' };

  const chipStyle = (active) => ({
    padding: '9px 0',
    minWidth: 0,
    borderRadius: '9999px',
    border: 'none',
    backgroundColor: active ? colors.brandPrimary : colors.appBg,
    color: active ? '#fff' : colors.textPrimary,
    fontSize: '13px',
    fontWeight: '500',
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  });

  const toggleStyle = (active) => ({
    flex: 1,
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: active ? colors.brandPrimary : colors.appBg,
    color: active ? '#fff' : colors.textPrimary,
    fontSize: '14px',
    fontWeight: '500',
    fontFamily: 'inherit',
    cursor: 'pointer',
  });

  const handleSearch = () => {
    onSearch({
      countryId: form.countryId || undefined,
      cityId: form.cityId || undefined,
      programmeId: form.programmeId || undefined,
      intakeYear: form.intakeYear || undefined,
      intakeMonths: form.intakeMonths,
      tuitionMin: 0,
      tuitionMax: form.tuitionMax,
      durationMinMonths: 1,
      durationMaxMonths: form.durationMaxYears * 12,
      hasScholarship: form.hasScholarship,
      _formState: form,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Search Courses" size="small">
      <div style={{ paddingTop: '8px' }}>
        <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert>

        {/* Country */}
        <div style={fieldWrap}>
          <Flag size={18} style={iconStyle} />
          <select
            value={form.countryId}
            onChange={(e) => set({ countryId: e.target.value, cityId: '' })}
            style={{ ...selectStyle, paddingLeft: '44px' }}
            aria-label="Select Country"
          >
            <option value="">Select Country</option>
            {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* City - cascades off country */}
        <div style={fieldWrap}>
          <Building2 size={18} style={iconStyle} />
          <select
            value={form.cityId}
            onChange={(e) => set({ cityId: e.target.value })}
            disabled={!form.countryId || citiesLoading}
            style={{ ...selectStyle, paddingLeft: '44px', cursor: form.countryId ? 'pointer' : 'not-allowed' }}
            aria-label="Select City"
          >
            <option value="">
              {!form.countryId ? 'Select a country first' : citiesLoading ? 'Loading cities...' : 'Select City'}
            </option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Programme */}
        <div style={fieldWrap}>
          <CalendarRange size={18} style={iconStyle} />
          <select
            value={form.programmeId}
            onChange={(e) => set({ programmeId: e.target.value })}
            style={{ ...selectStyle, paddingLeft: '44px' }}
            aria-label="Select Programme"
          >
            <option value="">Select Programme</option>
            {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Year */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', margin: '20px 0 12px' }}>
          <span style={{ fontSize: '14px', fontWeight: '500', color: colors.textPrimary }}>Start year &amp; month</span>
          <select
            value={form.intakeYear}
            onChange={(e) => set({ intakeYear: e.target.value })}
            style={{ ...selectStyle, width: 'auto', padding: '8px 12px', backgroundColor: colors.contentSurface, border: `1px solid ${colors.borderLight}` }}
            aria-label="Intake year"
          >
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Intake months */}
        <div style={sectionLabel}>Select Intake Months</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '20px' }}>
          {MONTHS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => toggleMonth(m.value)}
              style={chipStyle(form.intakeMonths.includes(m.value))}
            >
              {m.label}
            </button>
          ))}
        </div>
        {form.intakeMonths.length > 1 && (
          <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '-12px', marginBottom: '16px' }}>
            The backend filters by a month range, so this searches
            {' '}{MONTHS.find((m) => m.value === Math.min(...form.intakeMonths))?.label}
            {' – '}{MONTHS.find((m) => m.value === Math.max(...form.intakeMonths))?.label}.
          </div>
        )}

        {/* Tuition */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
          <span style={{ fontSize: '14px', fontWeight: '500', color: colors.textPrimary }}>Tuition Range</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: colors.brandPrimary }}>
            $0K – ${Math.round(form.tuitionMax / 1000)}K
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={TUITION_MAX}
          step={TUITION_STEP}
          value={form.tuitionMax}
          onChange={(e) => set({ tuitionMax: Number(e.target.value) })}
          style={{ width: '100%', accentColor: colors.brandPrimary, marginBottom: '20px' }}
          aria-label="Maximum tuition"
        />

        {/* Duration */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
          <span style={{ fontSize: '14px', fontWeight: '500', color: colors.textPrimary }}>Duration</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: colors.brandPrimary }}>
            1 – {form.durationMaxYears} year{form.durationMaxYears === 1 ? '' : 's'}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={DURATION_MAX_YEARS}
          step={1}
          value={form.durationMaxYears}
          onChange={(e) => set({ durationMaxYears: Number(e.target.value) })}
          style={{ width: '100%', accentColor: colors.brandPrimary, marginBottom: '20px' }}
          aria-label="Maximum duration in years"
        />

        {/* Scholarships */}
        <div style={sectionLabel}>Scholarships</div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            type="button"
            style={toggleStyle(form.hasScholarship === true)}
            onClick={() => set({ hasScholarship: form.hasScholarship === true ? null : true })}
          >
            Available
          </button>
          <button
            type="button"
            style={toggleStyle(form.hasScholarship === false)}
            onClick={() => set({ hasScholarship: form.hasScholarship === false ? null : false })}
          >
            Not Available
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="ghost" onClick={() => setForm(EMPTY)} style={{ flexShrink: 0 }}>
            Reset
          </Button>
          <Button onClick={handleSearch} style={{ flex: 1 }}>
            Search
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export { EMPTY as ADVANCED_SEARCH_DEFAULTS };
export default AdvancedSearchModal;
