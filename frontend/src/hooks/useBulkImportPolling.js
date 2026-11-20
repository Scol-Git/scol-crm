import { useEffect, useRef, useState } from 'react';
import { bulkImportService } from '../services/bulkImportService';
import { isBulkImportFinal } from '../services/mappers';

const DEFAULT_INTERVAL_MS = 2500;
// A blip (dropped request, backend restart) should not end the polling, but a
// backend that stays down should not be hammered forever either.
const MAX_CONSECUTIVE_FAILURES = 5;

// Polls GET /crm/bulk-imports/{batchId}/status until the batch reaches a final
// status, then calls onFinal(statusDto) once.
//
//   const { status, error } = useBulkImportPolling(batchId, { enabled, onFinal });
//
// `status` is the latest BulkImportStatusResponse (null before the first
// answer). `error` is set only when polling has given up.
export function useBulkImportPolling(batchId, { enabled = true, intervalMs = DEFAULT_INTERVAL_MS, onFinal } = {}) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  // Latest callback without restarting the poll loop when the parent re-renders.
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  });

  useEffect(() => {
    if (!batchId || !enabled) return undefined;

    let cancelled = false;
    let timer = null;
    let failures = 0;
    setStatus(null);
    setError('');

    const tick = async () => {
      try {
        const next = await bulkImportService.getStatus(batchId);
        if (cancelled) return;
        failures = 0;
        setStatus(next);
        if (isBulkImportFinal(next)) {
          onFinalRef.current?.(next);
          return;
        }
      } catch (err) {
        if (cancelled) return;
        failures += 1;
        // 404 will not fix itself; anything else gets a few more tries.
        if (err.statusCode === 404 || failures >= MAX_CONSECUTIVE_FAILURES) {
          console.error('Bulk import status polling stopped:', err);
          setError(err.message || 'Could not read the import status.');
          return;
        }
      }
      timer = setTimeout(tick, intervalMs);
    };

    tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [batchId, enabled, intervalMs]);

  return { status, error };
}

export default useBulkImportPolling;
