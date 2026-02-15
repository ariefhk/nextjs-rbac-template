import { headers } from 'next/headers';
import { env } from '@/lib/env';

/** Base URL for server-side self-requests (no trailing slash). */
export function getServerBaseUrl(): string {
  return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
}

/** Fetch options that forward the incoming request's cookies (for auth). */
export async function getServerAuthFetchOptions(): Promise<RequestInit> {
  const cookie = (await headers()).get('cookie');
  return { headers: cookie ? { cookie } : undefined };
}
