import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { Card, Table, SearchInput, Alert, DraftBadge, Pagination, SegmentedControl, FilterNotice } from '../../components';
import { useAuth } from '../../context';
import { crmUniversityService } from '../../services/crmUniversityService';
import { isPublishStatus } from '../../services/mappers';
import { useQueryParams } from '../../hooks/useQueryParams';
import { colors } from '../../theme';

// GET /crm/universities - ADMIN and COUNSELLOR.
//
// Exists because a draft university can have zero courses, so it never shows
// up in the course search. The view lives in the URL so the batch page can
// link straight to "drafts of this upload":
//   /universities?publishStatus=DRAFT&importBatchId=<batchId>&search=&page=
//
// Counsellors get the plain list: no tabs, no batch filter. The backend only
// ever returns published universities to them, whatever is asked for.

const PAGE_SIZE = 20;
const SEARCH_MAX_LENGTH = 100; // backend limit on `search`

const TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'PUBLISHED', label: 'Published' },
];

const UniversityList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [params, updateParams] = useQueryParams();

  const publishStatus = isAdmin && isPublishStatus(params.get('publishStatus')) ? params.get('publishStatus') : 'ALL';
  const importBatchId = isAdmin ? (params.get('importBatchId') ?? '') : '';
  const search = (params.get('search') ?? '').slice(0, SEARCH_MAX_LENGTH);
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);

  const [searchInput, setSearchInput] = useState(search);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Typing updates the URL after a pause; any new search starts at page 1.
  useEffect(() => {
    const text = searchInput.trim();
    if (text === search) return undefined;
    const timer = setTimeout(() => updateParams({ search: text, page: '' }, { replace: true }), 350);
    return () => clearTimeout(timer);
  }, [searchInput, search, updateParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const data = await crmUniversityService.list({
          // Not sent for counsellors; the backend would ignore them anyway.
          ...(isAdmin ? { publishStatus, importBatchId } : {}),
          search,
          page,
          pageSize: PAGE_SIZE,
        });
        if (cancelled) return;
        // The last row of the last page went away (published / deleted): step back.
        if (data.items.length === 0 && page > 1 && data.total > 0) {
          updateParams({ page: Math.ceil(data.total / PAGE_SIZE) }, { replace: true });
          return;
        }
        setItems(data.items);
        setTotal(data.total);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load universities:', err);
        setError(err.message || 'Failed to load universities.');
        setItems([]);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin, publishStatus, importBatchId, search, page, updateParams]);

  const columns = [
    {
      key: 'uniName',
      title: 'University',
      dataIndex: 'uniName',
      render: (uniName, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0, overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: colors.appBg, border: `1px solid ${colors.borderLight}`, color: colors.textMuted,
          }}>
            {row.logoUrl ? (
              <img
                src={row.logoUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : <Building2 size={18} />}
          </div>
          <span style={{ fontWeight: '500', overflowWrap: 'anywhere' }}>{uniName || 'Unnamed university'}</span>
          {!row.isPublished && <DraftBadge />}
        </div>
      ),
    },
    { key: 'countryName', title: 'Country', dataIndex: 'countryName', render: (value) => value || '-' },
    { key: 'cityName', title: 'City', dataIndex: 'cityName', render: (value) => value || '-' },
    {
      key: 'intakeCount',
      title: 'Intakes',
      dataIndex: 'intakeCount',
      headerStyle: { textAlign: 'right' },
      cellStyle: { textAlign: 'right' },
      render: (value) => (Number(value) || 0).toLocaleString(),
    },
  ];

  const emptyMessage = search
    ? `No universities match "${search}".`
    : importBatchId
      ? 'This import has no universities in this view.'
      : publishStatus === 'DRAFT'
        ? 'No draft universities.'
        : 'No universities found.';

  return (
    <div>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '12px',
        alignItems: 'center', marginBottom: '20px',
      }}>
        {isAdmin && (
          <SegmentedControl
            ariaLabel="Publish status"
            options={TABS}
            value={publishStatus}
            onChange={(value) => updateParams({ publishStatus: value === 'ALL' ? '' : value, page: '' })}
          />
        )}
        <SearchInput
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value.slice(0, SEARCH_MAX_LENGTH))}
          placeholder="Search by university name..."
          style={{ flex: 1, minWidth: '220px' }}
        />
      </div>

      {importBatchId && (
        <FilterNotice
          onClear={() => updateParams({ importBatchId: '', page: '' })}
          action={(
            <Link to={`/bulk-imports/${importBatchId}`} style={{ fontWeight: '600', textDecoration: 'underline' }}>
              Back to the import
            </Link>
          )}
        >
          Showing only universities from one import.
        </FilterNotice>
      )}

      <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert>

      <Card padding="0">
        <Table
          columns={columns}
          data={items}
          loading={loading}
          emptyMessage={emptyMessage}
          onRowClick={(row) => navigate(`/universities/${row.uniId}`, {
            // Lets the detail page's Back link return to this exact view.
            state: { from: `${location.pathname}${location.search}` },
          })}
        />
        {!loading && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={(next) => updateParams({ page: next > 1 ? next : '' })}
          />
        )}
      </Card>
    </div>
  );
};

export default UniversityList;
