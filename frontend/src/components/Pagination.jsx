import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';
import { colors } from '../theme';

// Page-number pagination for endpoints that return { page, pageSize, total }
// (bulk imports, universities). The older lists use cursors + "Load more".
const Pagination = ({ page, pageSize, total, onPageChange, disabled = false }) => {
  if (!total) return null;

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const first = (current - 1) * pageSize + 1;
  const last = Math.min(total, current * pageSize);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: '12px', padding: '14px 16px',
      borderTop: `1px solid ${colors.borderLight}`,
      fontSize: '13px', color: colors.textSecondary,
    }}>
      <span>
        Showing {first.toLocaleString()}–{last.toLocaleString()} of {total.toLocaleString()}
      </span>
      {pageCount > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            variant="secondary"
            size="small"
            icon={ChevronLeft}
            disabled={disabled || current <= 1}
            onClick={() => onPageChange(current - 1)}
          >
            Previous
          </Button>
          <span>Page {current} of {pageCount}</span>
          <Button
            variant="secondary"
            size="small"
            disabled={disabled || current >= pageCount}
            onClick={() => onPageChange(current + 1)}
          >
            Next <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
