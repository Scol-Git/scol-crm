// Thin fetch wrapper around the SCOL backend API.
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

class ApiError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

async function request(path, { method = 'GET', body, auth = true, token, headers = {}, _retried = false } = {}) {
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

  if (res.status === 401 && auth && !token && !_retried && tokenStorage.getRefreshToken()) {
    try {
      await refreshAccessToken();
      return request(path, { method, body, auth, token, headers, _retried: true });
    } catch {
      tokenStorage.clear();
      window.location.assign('/login');
      throw new ApiError('Session expired. Please log in again.', 401);
    }
  }

  if (!res.ok || json?.status === 'error') {
    const message = json?.message || `Request failed with status ${res.status}`;
    throw new ApiError(message, json?.statusCode ?? res.status, json?.error?.code);
  }

  return json?.data;
}

// The backend doesn't document response bodies for a few list endpoints.
// This defensively pulls an array out of common wrapper shapes so the UI
// doesn't break if the actual key differs from what we assumed.
export function extractList(data, extraKeys = []) {
  if (Array.isArray(data)) return { items: data, pagination: null };
  if (!data || typeof data !== 'object') return { items: [], pagination: null };

  const candidates = [...extraKeys, 'items', 'results', 'data'];
  for (const key of candidates) {
    if (Array.isArray(data[key])) {
      return { items: data[key], pagination: data.pagination ?? null };
    }
  }
  return { items: [], pagination: data.pagination ?? null };
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

export default api;
