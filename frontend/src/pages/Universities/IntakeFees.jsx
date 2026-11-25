import { useEffect, useState } from 'react';
import { Card, Select, Input, Button, Alert, ConfirmDialog } from '../../components';
import { crmUniversityService } from '../../services/crmUniversityService';
import { colors } from '../../theme';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const isDmyDate = (raw) => {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(raw);
  if (!match) return false;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const IntakeFees = ({ uniId }) => {
  const [intakes, setIntakes] = useState([]);
  const [period, setPeriod] = useState('');
  const [deadline, setDeadline] = useState('');
  const [fee, setFee] = useState('');
  const [loadingIntakes, setLoadingIntakes] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [result, setResult] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!uniId) {
      setIntakes([]);
      setPeriod('');
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoadingIntakes(true);
      setError('');
      try {
        const rows = await crmUniversityService.listIntakes(uniId);
        if (!cancelled) {
          setIntakes(rows);
          setPeriod('');
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load intakes.');
      } finally {
        if (!cancelled) setLoadingIntakes(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uniId]);

  const selected = intakes.find((row) => `${row.intakeMonth}-${row.intakeYear}` === period);

  const askConfirm = () => {
    setFieldError('');
    setResult('');
    const deadlineValue = deadline.trim();
    const feeValue = fee.trim();
    if (!selected) {
      setFieldError('Choose an intake.');
      return;
    }
    if (!deadlineValue && !feeValue) {
      setFieldError('Enter a deadline, an application fee, or both.');
      return;
    }
    if (deadlineValue && !isDmyDate(deadlineValue)) {
      setFieldError('date must be DD-MM-YYYY');
      return;
    }
    if (feeValue && !/^\d+(\.\d{1,2})?$/.test(feeValue)) {
      setFieldError('Enter an application fee with up to 2 decimal places.');
      return;
    }
    setConfirmOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const body = {
        intakeMonth: selected.intakeMonth,
        intakeYear: selected.intakeYear,
      };
      if (deadline.trim()) body.applicationDeadline = deadline.trim();
      if (fee.trim()) body.applicationFee = fee.trim();
      const data = await crmUniversityService.updateIntakeFees(uniId, body);
      setResult(`Updated ${data?.updatedCount ?? 0} courses.`);
      setConfirmOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to update courses.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert>
      <Alert variant="success" onDismiss={() => setResult('')}>{result}</Alert>
      <Card title="Intake fees">
        <p style={{ marginTop: 0, fontSize: '14px', lineHeight: 1.5, color: colors.textSecondary }}>
          Set the application deadline and application fee for every course in one intake, published and unpublished.
        </p>
        <Select
          label="Intake"
          value={period}
          disabled={!uniId || loadingIntakes}
          placeholder={loadingIntakes ? 'Loading...' : intakes.length ? 'Select an intake' : 'No intakes'}
          options={intakes.map((row) => ({
            value: `${row.intakeMonth}-${row.intakeYear}`,
            label: `${MONTHS[row.intakeMonth - 1] ?? row.intakeMonth} ${row.intakeYear} (${row.courseCount} courses)`,
          }))}
          onChange={(e) => setPeriod(e.target.value)}
        />
        <Input
          label="Application deadline"
          placeholder="DD-MM-YYYY"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
        <Input
          label="Application fee"
          inputMode="decimal"
          placeholder="e.g. 75.00"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
        />
        {fieldError && <p style={{ color: colors.error, fontSize: '13px' }}>{fieldError}</p>}
        <Button onClick={askConfirm} disabled={!intakes.length}>Save</Button>
      </Card>
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={save}
        title="Update this intake"
        confirmLabel="Update courses"
        confirmVariant="primary"
        busy={saving}
        error={error}
      >
        This replaces the deadline and application fee on every course in this intake, published and unpublished.
        {selected ? ` ${MONTHS[selected.intakeMonth - 1]} ${selected.intakeYear} covers ${selected.courseCount} courses.` : ''}
      </ConfirmDialog>
    </div>
  );
};

export default IntakeFees;
