// Thin fetch wrapper around the SCOL backend API.
//
// VITE_API_BASE_URL is inlined by Vite at BUILD time, not read at runtime. If
// it's missing from the build environment (e.g. .env is gitignored and the host
// has no env var set), every URL becomes "undefined/auth/login" - a relative
// path that hits the SPA's own origin, gets caught by the catch-all rewrite,
// and returns a baffling 405. Fail with a clear message instead.
const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Tolerate a trailing slash so "https://host/" + "/auth/login" isn't "//auth/login".
const BASE_URL = typeof RAW_BASE_URL === 'string' ? RAW_BASE_URL.replace(/\/+$/, '') : RAW_BASE_URL;

const BASE_URL_MISSING = !BASE_URL || BASE_URL === 'undefined';

const CONFIG_ERROR =
  'API base URL is not configured. VITE_API_BASE_URL was missing when this app was built, '
  + 'so it cannot reach the backend. Set it in your hosting provider\'s environment variables '
  + '(Vercel: Settings → Environment Variables) and redeploy — Vite bakes this value in at '
  + 'build time, so changing it requires a new build.';

if (BASE_URL_MISSING) {
  // Surfaces once at load, before any request is attempted.
  console.error('[apiClient] ' + CONFIG_ERROR);
}

const STORAGE_KEYS = {
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  user: 'user',
};

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(STORAGE_KEYS.accessToken),
  getRefreshToken: () => localStorage.getItem(STORAGE_KEYS.refreshToken),
  getUser: () => {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setSession: ({ user, accessToken, refreshToken }) => {
    if (accessToken) localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
    if (refreshToken) localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
    if (user) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  },
  setAccessToken: (accessToken) => {
    localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
  },
  clear: () => {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.user);
  },
};

// The login response now includes user.userRole (e.g. ["ADMIN"]). Verified live.
export const CRM_ROLES = ['ADMIN', 'COUNSELLOR'];

export function getUserRoles(user = tokenStorage.getUser()) {
  const r = user?.userRole ?? user?.roles ?? user?.role;
  if (!r) return [];
  return (Array.isArray(r) ? r : [r]).map((x) => String(x).toUpperCase());
}

export function hasCrmAccess(user) {
  const roles = getUserRoles(user);
  return roles.some((r) => CRM_ROLES.includes(r));
}

export function isAdmin(user) {
  return getUserRoles(user).includes('ADMIN');
}

let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token available');

  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${refreshToken}` },
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || json?.status === 'error') {
          throw new Error(json?.message || 'Session expired');
        }
        const { accessToken, user } = json.data;
        tokenStorage.setAccessToken(accessToken);
        if (user) tokenStorage.setSession({ user });
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

// Drop the session and send the user to /login. Guarded so that a burst of
// parallel 401s (a page firing several requests at once) only redirects once.
let redirecting = false;
function endSession() {
  tokenStorage.clear();
  if (redirecting) return;
  redirecting = true;
  if (window.location.pathname !== '/login') window.location.assign('/login');
}

class ApiError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    // Set for the "authenticated, but this user isn't a CRM consultant" case.
    this.noCrmAccess = false;
  }
}

// CRM endpoints require an ADMIN or COUNSELLOR role. Two distinct rejections:
//   403 — authenticated, but the role isn't allowed (documented).
//   404 "Consultant user not found" — authenticated, but no consultant record
//        exists for this user. Reads as "endpoint missing" unless translated.
const CRM_ACCESS_PATTERN = /consultant\s+user\s+not\s+found|consultant\s+not\s+found/i;

function buildError(path, res, json) {
  const raw = json?.message || `Request failed with status ${res.status}`;
  const isCrmPath = path.startsWith('/crm/');

  if (isCrmPath && (res.status === 403 || CRM_ACCESS_PATTERN.test(raw))) {
    const err = new ApiError(
      res.status === 403
        ? 'This account is signed in but does not have CRM permissions. CRM screens require an ADMIN or COUNSELLOR role.'
        : 'This account does not have CRM access. It is signed in successfully, but has no consultant record on the backend, so CRM data cannot be loaded. Ask the backend team to attach a consultant record to this user.',
      res.status,
      json?.error?.code,
    );
    err.noCrmAccess = true;
    err.rawMessage = raw;
    return err;
  }

  return new ApiError(raw, json?.statusCode ?? res.status, json?.error?.code);
}

async function request(path, { method = 'GET', body, auth = true, token, headers = {}, _retried = false } = {}) {
  if (BASE_URL_MISSING) {
    throw new ApiError(CONFIG_ERROR, 0, 'MISSING_API_BASE_URL');
  }

  const finalHeaders = { ...headers };
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';

  const bearer = token || (auth ? tokenStorage.getAccessToken() : null);
  if (bearer) finalHeaders.Authorization = `Bearer ${bearer}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);

  // Any 401 on an authenticated call means the session is gone. Try a silent
  // refresh when we have a refresh token; otherwise bounce to /login. Without
  // the else-branch a missing refresh token left the 401 to propagate into the
  // pages' catch blocks, which rendered every screen permanently blank.
  if (res.status === 401 && auth && !token && !_retried) {
    if (tokenStorage.getRefreshToken()) {
      try {
        await refreshAccessToken();
        return request(path, { method, body, auth, token, headers, _retried: true });
      } catch {
        endSession();
        throw new ApiError('Session expired. Please log in again.', 401);
      }
    }
    endSession();
    throw new ApiError('Session expired. Please log in again.', 401);
  }

  if (!res.ok || json?.status === 'error') {
    throw buildError(path, res, json);
  }

  return json?.data;
}

// The backend doesn't document response bodies for the /crm/* list endpoints.
// Verified convention (from /home and /search, which are documented): the
// collection is keyed by entity name alongside a cursor pagination object:
//   { <entity>: [...], pagination: { cursor, limit, hasNext } }
// We still probe common alternatives so a differing key doesn't blank the UI.
export function extractList(data, extraKeys = []) {
  const emptyPage = { cursor: null, hasNext: false };

  if (Array.isArray(data)) return { items: data, pagination: emptyPage };
  if (!data || typeof data !== 'object') return { items: [], pagination: emptyPage };

  const pagination = {
    cursor: data.pagination?.cursor ?? data.cursor ?? null,
    hasNext: data.pagination?.hasNext ?? data.hasNext ?? false,
    limit: data.pagination?.limit,
    totalCount: data.pagination?.totalCount ?? data.totalCount ?? null,
  };

  const candidates = [...extraKeys, 'items', 'results', 'data'];
  for (const key of candidates) {
    if (Array.isArray(data[key])) return { items: data[key], pagination };
  }
  return { items: [], pagination };
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

export default api;
