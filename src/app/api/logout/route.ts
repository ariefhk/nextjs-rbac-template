import { NextRequest, NextResponse } from 'next/server';
import {
  AuthService,
  SESSION_ACCESS_COOKIE_NAME,
} from '@/services/auth.services';

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

    return response;
  } catch (_error) {
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
