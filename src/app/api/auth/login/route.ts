import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE_NAME } from '@/lib/auth-cookies';
import { prisma } from '@/lib/prisma';
// import { withRateLimit } from '@/lib/rate-limit';
import { RBACService } from '@/services/rbac.services';
import { AuthService } from '@/services/auth.services';
import { logger } from '@/lib/logger';
import { formatZodErrors } from '@/lib/validation';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const result = await AuthService.login(email, password, request);

    // Fetch full user with roles/permissions (same shape as /api/auth/me) so client doesn't need a second request
    const userWithRoles = await prisma.user.findUnique({
      where: { id: result.user.id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
    const permissions = userWithRoles
      ? RBACService.extractPermissions(userWithRoles)
      : [];
    const roles = userWithRoles?.roles.map(ur => ur.role.name) ?? [];

    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          image: result.user.image,
          roles,
          permissions,
        },
      },
      { status: 200 }
    );

    // Set secure cookies
    const isProduction = process.env.NODE_ENV === 'production';
    // const maxAge = 15 * 60; // 15 minutes for access token÷
    const maxAge = 1 * 60; // 1 hour for access token
    const refreshMaxAge = 7 * 24 * 60 * 60; // 7 days for refresh token

    response.cookies.set(ACCESS_TOKEN_COOKIE_NAME, result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge,
      path: '/',
    });

    response.cookies.set('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: refreshMaxAge,
      path: '/',
    });

    response.cookies.set('session_id', result.sessionId, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: refreshMaxAge,
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodErrors(error) },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Login failed';
    logger.error('Login error', { error: message });

    return NextResponse.json({ error: message }, { status: 401 });
  }
}
