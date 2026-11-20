import { colors } from '../theme';

// value: 0..1 for a known fraction; null/undefined for "busy, amount unknown".
const ProgressBar = ({ value, label, detail }) => {
  const determinate = typeof value === 'number' && Number.isFinite(value);
  const percent = determinate ? Math.round(Math.min(1, Math.max(0, value)) * 100) : null;

  return (
    <div>
      {(label || detail) && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', gap: '12px',
          fontSize: '13px', marginBottom: '6px',
        }}>
          <span style={{ color: colors.textPrimary, fontWeight: '500' }}>{label}</span>
          <span style={{ color: colors.textSecondary }}>{detail ?? (determinate ? `${percent}%` : '')}</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        {...(determinate ? { 'aria-valuenow': percent } : {})}
        style={{
          height: '8px', borderRadius: '9999px', overflow: 'hidden',
          backgroundColor: colors.borderLight,
        }}
      >
        {determinate ? (
          <div style={{
            width: `${percent}%`, height: '100%', borderRadius: '9999px',
            backgroundColor: colors.brandPrimary, transition: 'width 0.3s ease',
          }} />
        ) : (
          // Animation is defined in index.css.
          <div className="progress-indeterminate" style={{
            width: '40%', height: '100%', borderRadius: '9999px',
            backgroundColor: colors.brandPrimary,
          }} />
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
