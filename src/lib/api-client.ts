/* eslint-disable @typescript-eslint/no-explicit-any */
// import { useNotifications } from '@/hooks/useNotifications';
// import { env } from './env';

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  cookie?: string;
  params?: Record<string, string | number | boolean | undefined | null>;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
  /** Internal: skip refresh + retry (used after we already tried refresh once). */
  _isRetry?: boolean;
};

function buildUrlWithParams(
  url: string,
  params?: RequestOptions['params']
): string {
  if (!params) return url;
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null
    )
  );
  if (Object.keys(filteredParams).length === 0) return url;
  const queryString = new URLSearchParams(
    filteredParams as Record<string, string>
  ).toString();
  return `${url}?${queryString}`;
}

// Create a separate function for getting server-side cookies that can be imported where needed
export function getServerCookies() {
  if (typeof window !== 'undefined') return '';

  // Dynamic import next/headers only on server-side (cookies() is async in Next.js 15+)
  return import('next/headers').then(async ({ cookies }) => {
    try {
      const cookieStore = await cookies();
      return cookieStore
        .getAll()
        .map(c => `${c.name}=${c.value}`)
        .join('; ');
    } catch (error) {
      console.error('Failed to access cookies:', error);
      return '';
    }
  });
}
const baseUrl = () =>
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL
    : '';

/** Try to refresh access token using refresh_token cookie. Client-only. Uses relative URL so cookies are sent. */
async function tryRefreshToken(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

let onGlobalSessionExpired: (() => void) | undefined;

/** Register a callback when session expires after refresh failed (e.g. clear auth + redirect). Call from AuthProvider. */
export function setOnGlobalSessionExpired(
  callback: (() => void) | undefined
): void {
  onGlobalSessionExpired = callback;
}

/** Dev-only: trigger the session-expired callback to test useRegisterSessionExpired + auth context. */
export function triggerSessionExpiredForTesting(): void {
  if (process.env.NODE_ENV !== 'development') return;
  onGlobalSessionExpired?.();
}

async function fetchApi<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    cookie,
    params,
    cache = 'no-store',
    next,
    _isRetry = false,
  } = options;

  // Get cookies from the request when running on server
  let cookieHeader = cookie;
  if (typeof window === 'undefined' && !cookie) {
    cookieHeader = await getServerCookies();
  }

  // Client: use relative URL so request is same-origin and cookies are always sent (avoids localhost vs 127.0.0.1 mismatch after refresh).
  // Server: need absolute URL for fetch.
  const fullUrl =
    typeof window !== 'undefined'
      ? buildUrlWithParams(url, params)
      : buildUrlWithParams(
          `${baseUrl() || process.env.NEXT_PUBLIC_APP_URL}${url}`,
          params
        );

  const doFetch = () =>
    fetch(fullUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
      cache,
      next,
    });

  let response = await doFetch();

  // On 401 (client-only): try refresh once, then retry request. If still 401 or refresh fails, call onSessionExpired and throw (skip callback for logout to avoid loop).
  if (response.status === 401 && typeof window !== 'undefined' && !_isRetry) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      response = await doFetch();
    }
    if (response.status === 401) {
      if (!url.includes('/api/auth/logout')) {
        onGlobalSessionExpired?.();
      }
      throw new Error('Session expired');
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      (body && (body.error ?? body.message)) || response.statusText;
    if (typeof window !== 'undefined') {
      // useNotifications.getState().addNotification({ ... });
    }
    throw new Error(message);
  }

  return response.json();
}

export const api = {
  get<T>(url: string, options?: RequestOptions): Promise<T> {
    return fetchApi<T>(url, { ...options, method: 'GET' });
  },
  post<T>(url: string, body?: any, options?: RequestOptions): Promise<T> {
    return fetchApi<T>(url, { ...options, method: 'POST', body });
  },
  put<T>(url: string, body?: any, options?: RequestOptions): Promise<T> {
    return fetchApi<T>(url, { ...options, method: 'PUT', body });
  },
  patch<T>(url: string, body?: any, options?: RequestOptions): Promise<T> {
    return fetchApi<T>(url, { ...options, method: 'PATCH', body });
  },
  delete<T>(url: string, options?: RequestOptions): Promise<T> {
    return fetchApi<T>(url, { ...options, method: 'DELETE' });
  },
};
