import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_TOKEN_COOKIE_NAME,
  SESSION_EXISTS_COOKIE_NAME,
} from '@/lib/auth-cookies';
import { AuthService } from '@/services/auth.services';
import { SESSION_ACCESS_COOKIE_NAME } from '@/services/auth.services';

const AUTH_COOKIE_NAMES = [
  ACCESS_TOKEN_COOKIE_NAME,
  'refresh_token',
  'session_id',
  SESSION_EXISTS_COOKIE_NAME,
] as const;

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_ACCESS_COOKIE_NAME)?.value;

    if (token) {
      await AuthService.deleteSession(token);
    }

    const response = NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    );

    // Clear auth cookies so client can log in again
    for (const name of AUTH_COOKIE_NAMES) {
      response.cookies.set(name, '', { path: '/', maxAge: 0 });
    }

    return response;
  } catch (_error) {
    console.error('Logout failed', _error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
