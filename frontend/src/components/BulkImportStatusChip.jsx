import { BULK_IMPORT_STATUS, bulkImportStatusVariant, isBulkImportInFlight } from '../services/mappers';
import { colors } from '../theme';

const PALETTE = {
  default: { backgroundColor: colors.borderLight, color: colors.textPrimary },
  info: { backgroundColor: colors.statusNew, color: '#1E40AF' },
  warning: { backgroundColor: colors.statusContacted, color: '#92400E' },
  error: { backgroundColor: colors.statusLost, color: '#991B1B' },
  success: { backgroundColor: colors.statusQualified, color: '#065F46' },
  muted: { backgroundColor: colors.appBg, color: colors.textMuted, border: `1px solid ${colors.borderLight}` },
};

// Status of a bulk import batch. Shows a spinner while the worker has it.
const BulkImportStatusChip = ({ status, size = 'small' }) => {
  const palette = PALETTE[bulkImportStatusVariant(status)] || PALETTE.default;
  const spinning = isBulkImportInFlight(status);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        borderRadius: '9999px',
        padding: size === 'medium' ? '4px 12px' : '2px 10px',
        fontSize: size === 'medium' ? '13px' : '12px',
        fontWeight: '500',
        whiteSpace: 'nowrap',
        ...palette,
      }}
    >
      {spinning && (
        <span
          aria-hidden="true"
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            border: `2px solid ${palette.color}40`,
            borderTopColor: palette.color,
            // `spin` keyframes live in index.css (shared with .loading-spinner).
            animation: 'spin 0.8s linear infinite',
          }}
        />
      )}
      {BULK_IMPORT_STATUS.label(status)}
    </span>
  );
};

export default BulkImportStatusChip;
