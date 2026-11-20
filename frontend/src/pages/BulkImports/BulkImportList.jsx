import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Card, Table, Button, Select, Alert, Badge, Pagination, BulkImportStatusChip } from '../../components';
import { bulkImportService } from '../../services/bulkImportService';
import { BULK_IMPORT_TYPE, BULK_IMPORT_STATUS, isBulkImportInFlight } from '../../services/mappers';
import { formatDateTime, formatCount } from '../../utils/format';
import { colors } from '../../theme';
import NewImportModal from './NewImportModal';

// GET /crm/bulk-imports - ADMIN only, newest first.

const PAGE_SIZE = 20;
// While the worker still has a batch on this page, keep its row current.
const AUTO_REFRESH_MS = 5000;

const TYPE_OPTIONS = [{ value: '', label: 'All types' }, ...BULK_IMPORT_TYPE.options];
const STATUS_OPTIONS = [{ value: '', label: 'All statuses' }, ...BULK_IMPORT_STATUS.options];

const numberCell = { textAlign: 'right', whiteSpace: 'nowrap' };

const BulkImportList = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);

  // Only the newest request may write state: filters can change, and the
  // background refresh can fire, while an older request is still in flight.
  const requestRef = useRef(0);

  // silent = background refresh: no spinner, and a failure keeps the rows.
  const load = useCallback(async ({ silent = false } = {}) => {
    const requestId = ++requestRef.current;
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await bulkImportService.list({ type, status, page, pageSize: PAGE_SIZE });
      if (requestId !== requestRef.current) return;
      // The last row of the last page was discarded elsewhere: step back.
      if (data.items.length === 0 && page > 1 && data.total > 0) {
        setPage(Math.ceil(data.total / PAGE_SIZE));
        return;
      }
      setItems(data.items.map((b) => ({ ...b, id: b.batchId })));
      setTotal(data.total);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      console.error('Failed to load bulk imports:', err);
      if (!silent) {
        setError(err.message || 'Failed to load bulk imports.');
        setItems([]);
        setTotal(0);
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [type, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const hasInFlight = items.some((b) => isBulkImportInFlight(b.status));
  useEffect(() => {
    if (!hasInFlight) return undefined;
    const timer = setInterval(() => load({ silent: true }), AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [hasInFlight, load]);

  const columns = [
    {
      key: 'fileName',
      title: 'File name',
      dataIndex: 'fileName',
      render: (fileName) => (
        <span style={{ fontWeight: '500', overflowWrap: 'anywhere' }}>{fileName || '-'}</span>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      dataIndex: 'type',
      render: (value) => <Badge size="small">{BULK_IMPORT_TYPE.label(value)}</Badge>,
    },
    {
      key: 'status',
      title: 'Status',
      dataIndex: 'status',
      render: (value) => <BulkImportStatusChip status={value} />,
    },
    { key: 'totalRows', title: 'Rows', dataIndex: 'totalRows', render: formatCount, headerStyle: numberCell, cellStyle: numberCell },
    { key: 'createdCount', title: 'Created', dataIndex: 'createdCount', render: formatCount, headerStyle: numberCell, cellStyle: numberCell },
    { key: 'updatedCount', title: 'Updated', dataIndex: 'updatedCount', render: formatCount, headerStyle: numberCell, cellStyle: numberCell },
    {
      key: 'errorCount',
      title: 'Errors',
      dataIndex: 'errorCount',
      headerStyle: numberCell,
      cellStyle: numberCell,
      render: (value) => (
        <span style={Number(value) > 0 ? { color: colors.error, fontWeight: '600' } : undefined}>{formatCount(value)}</span>
      ),
    },
    {
      key: 'warningCount',
      title: 'Warnings',
      dataIndex: 'warningCount',
      headerStyle: numberCell,
      cellStyle: numberCell,
      render: (value) => (
        <span style={Number(value) > 0 ? { color: '#B45309', fontWeight: '600' } : undefined}>{formatCount(value)}</span>
      ),
    },
    {
      key: 'uploadedBy',
      title: 'Uploaded by',
      dataIndex: 'uploadedBy',
      // `name` is the uploader's email; the backend has no display name.
      render: (uploadedBy) => uploadedBy?.name || '-',
    },
    {
      key: 'createdAt',
      title: 'Uploaded at',
      dataIndex: 'createdAt',
      cellStyle: { whiteSpace: 'nowrap' },
      render: (value) => formatDateTime(value),
    },
  ];

  const filtered = !!(type || status);

  return (
    <div>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '12px',
        alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <Select
            label="Type"
            name="type"
            value={type}
            options={TYPE_OPTIONS}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            containerStyle={{ marginBottom: 0, minWidth: '170px' }}
          />
          <Select
            label="Status"
            name="status"
            value={status}
            options={STATUS_OPTIONS}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            containerStyle={{ marginBottom: 0, minWidth: '190px' }}
          />
        </div>
        <Button icon={Plus} onClick={() => setShowNew(true)}>New import</Button>
      </div>

      <Alert variant="error" onDismiss={() => setError('')}>{error}</Alert>

      <Card padding="0">
        <Table
          columns={columns}
          data={items}
          loading={loading}
          onRowClick={(row) => navigate(`/bulk-imports/${row.batchId}`)}
          emptyMessage={filtered
            ? 'No imports match these filters.'
            : 'No imports yet. Use "New import" to upload a university or course CSV.'}
        />
        {!loading && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        )}
      </Card>

      {/* Mounted only while open, so every import starts from a clean form. */}
      {showNew && (
        <NewImportModal
          onClose={() => { setShowNew(false); load({ silent: true }); }}
          onFinished={(batchId) => navigate(`/bulk-imports/${batchId}`)}
        />
      )}
    </div>
  );
};

export default BulkImportList;
