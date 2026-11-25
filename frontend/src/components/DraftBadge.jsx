import { colors } from '../theme';

// Marks a university / course / intake that is imported but not published:
// visible and editable in the CRM, invisible to students and counsellors.
const DraftBadge = ({ size = 'small', style = {} }) => (
  <span
    title="Draft: not published yet, so students cannot see it."
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      flexShrink: 0,
      borderRadius: '9999px',
      padding: size === 'medium' ? '4px 12px' : '2px 8px',
      fontSize: size === 'medium' ? '12px' : '11px',
      fontWeight: '700',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      backgroundColor: colors.statusContacted,
      color: '#92400E',
      border: '1px solid #FCD34D',
      ...style,
    }}
  >
    Draft
  </span>
);

export default DraftBadge;
