import { useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

// URL query params as page state, so a filtered view can be linked to.
//
//   const [params, updateParams] = useQueryParams();
//   updateParams({ publishStatus: 'DRAFT', page: '' });   // '' / null removes a key
//   updateParams({ search: 'abc' }, { replace: true });   // no new history entry
//
// Router state (e.g. where the user came from) is carried over, because a
// plain setSearchParams would drop it.
export function useQueryParams() {
  const [params, setParams] = useSearchParams();
  const { state } = useLocation();

  const updateParams = useCallback((patch, { replace = false } = {}) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(patch)) {
        if (value === '' || value == null) next.delete(key);
        else next.set(key, String(value));
      }
      return next;
    }, { replace, state });
  }, [setParams, state]);

  return [params, updateParams];
}

export default useQueryParams;
