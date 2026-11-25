import { X } from 'lucide-react';
import { colors } from '../theme';

// Banner for a filter that came from a link rather than from a control on the
// page (e.g. "only items from one import"), with a way to remove it.
//   children  what is being shown
//   action    optional extra link, e.g. back to the import
const FilterNotice = ({ children, action, onClear, clearLabel = 'Show all' }) => (
  <div style={{
    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px',
    padding: '10px 14px', marginBottom: '16px', borderRadius: '8px',
    backgroundColor: colors.statusNew, color: '#1E40AF', fontSize: '14px',
  }}>
    <span style={{ flex: 1, minWidth: '200px', overflowWrap: 'anywhere' }}>{children}</span>
    {action}
    {onClear && (
      <button
        type="button"
        onClick={onClear}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px', border: 'none',
          background: 'transparent', color: 'inherit', cursor: 'pointer',
          fontSize: '14px', fontFamily: 'inherit', fontWeight: '600', padding: 0,
        }}
      >
        <X size={14} /> {clearLabel}
      </button>
    )}
  </div>
);

export default FilterNotice;
