/**
 * Auth cookie names (must match what API routes set).
 * Use `cookies()` from `next/headers` in server components / API routes.
 * In client components, use hasAccessTokenCookie() below (Next.js cookies() is server-only).
 */
export const ACCESS_TOKEN_COOKIE_NAME = 'access_token';

/**
 * Readable by JS (httpOnly: false). Set on login, cleared on logout.
 * Use getCookie(SESSION_EXISTS_COOKIE_NAME) in client to skip /api/auth/me when not logged in.
 */
export const SESSION_EXISTS_COOKIE_NAME = 'session_exists';

/**
 * Client-side only: returns true if the access_token cookie is present and non-empty.
 * Use this in 'use client' hooks; for server-side, use cookies().get(ACCESS_TOKEN_COOKIE_NAME) from next/headers.
 */
export function hasAccessTokenCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie
    .split('; ')
    .some(
      item =>
        item.startsWith(`${ACCESS_TOKEN_COOKIE_NAME}=`) &&
        item.length > ACCESS_TOKEN_COOKIE_NAME.length + 1
    );
}
