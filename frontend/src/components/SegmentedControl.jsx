import { colors } from '../theme';

// A small row of mutually exclusive choices, e.g. All / Drafts / Published.
// options: [{ value, label }]
const SegmentedControl = ({ options, value, onChange, ariaLabel, style = {} }) => (
  <div
    role="group"
    aria-label={ariaLabel}
    style={{
      display: 'inline-flex',
      padding: '3px',
      gap: '2px',
      borderRadius: '10px',
      backgroundColor: colors.borderLight,
      flexShrink: 0,
      ...style,
    }}
  >
    {options.map((option) => {
      const active = option.value === value;
      return (
        <button
          key={option.value}
          type="button"
          aria-pressed={active}
          onClick={() => { if (!active) onChange(option.value); }}
          style={{
            padding: '7px 14px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontFamily: 'inherit',
            fontWeight: active ? '600' : '500',
            cursor: active ? 'default' : 'pointer',
            whiteSpace: 'nowrap',
            backgroundColor: active ? colors.contentSurface : 'transparent',
            color: active ? colors.brandPrimary : colors.textSecondary,
            boxShadow: active ? '0 1px 2px rgba(0, 0, 0, 0.12)' : 'none',
            transition: 'background-color 0.15s ease',
          }}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

export default SegmentedControl;
