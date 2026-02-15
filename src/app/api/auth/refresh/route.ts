import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE_NAME } from '@/lib/auth-cookies';
import {
  AuthService,
  SESSION_REFRESH_COOKIE_NAME,
} from '@/services/auth.services';

/**
 * POST /api/auth/refresh — exchange refresh_token cookie for a new access_token.
 * Does NOT create a new session: validates existing session, updates its accessToken
 * and lastActivity, and sets only the access_token cookie (no session_exists, session_id, or new DB row).
 */
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(SESSION_REFRESH_COOKIE_NAME)?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  try {
    const result = await AuthService.refreshAccessToken(refreshToken, request);

    if (!result) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const maxAge = 15 * 60; // 15 min, match typical JWT access expiry

    const response = NextResponse.json({ ok: true }, { status: 200 });
    // Only set new access_token; do NOT set session_exists / session_id / refresh_token (same session, not login).
    response.cookies.set(ACCESS_TOKEN_COOKIE_NAME, result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge,
      path: '/',
    });

    // Readable by JS so client can skip /api/auth/me when not logged in
    response.cookies.set('session_exists', '1', {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'strict',
      maxAge,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 401 }
    );
  }
}
