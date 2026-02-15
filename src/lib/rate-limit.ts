import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { NextRequest, NextResponse } from 'next/server';
import { env } from './env';
import { logger } from './logger';

// Different rate limiters for different endpoints
const loginLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 15 * 60, // per 15 minutes
  blockDuration: 60 * 60, // Block for 1 hour after exceeding
});

const registerLimiter = new RateLimiterMemory({
  points: 3, // 3 registrations
  duration: 60 * 60, // per hour
});

const apiLimiter = new RateLimiterMemory({
  points: parseInt(env.RATE_LIMIT_MAX),
  duration: parseInt(env.RATE_LIMIT_WINDOW_MS) / 1000,
});

const passwordResetLimiter = new RateLimiterMemory({
  points: 3, // 3 attempts
  duration: 60 * 60, // per hour
});

export type RateLimiterType = 'login' | 'register' | 'api' | 'passwordReset';

export async function checkRateLimit(
  request: NextRequest,
  type: RateLimiterType = 'api'
): Promise<{ success: boolean; response?: NextResponse }> {
  const identifier = getClientIdentifier(request);

  let limiter: RateLimiterMemory;
  let limitName: string;

  switch (type) {
    case 'login':
      limiter = loginLimiter;
      limitName = 'Login';
      break;
    case 'register':
      limiter = registerLimiter;
      limitName = 'Registration';
      break;
    case 'passwordReset':
      limiter = passwordResetLimiter;
      limitName = 'Password Reset';
      break;
    default:
      limiter = apiLimiter;
      limitName = 'API';
  }

  try {
    await limiter.consume(identifier);
    return { success: true };
  } catch (rateLimiterRes) {
    const res = rateLimiterRes as RateLimiterRes;

    logger.warn(`Rate limit exceeded for ${limitName}`, {
      identifier,
      type,
      remainingPoints: res.remainingPoints,
      msBeforeNext: res.msBeforeNext,
    });

    const response = NextResponse.json(
      {
        error: 'Too many requests',
        message: `You have exceeded the ${limitName.toLowerCase()} rate limit. Please try again later.`,
        retryAfter: Math.ceil(res.msBeforeNext / 1000),
      },
      { status: 429 }
    );

    response.headers.set(
      'Retry-After',
      String(Math.ceil(res.msBeforeNext / 1000))
    );
    response.headers.set('X-RateLimit-Limit', String(limiter.points));
    response.headers.set('X-RateLimit-Remaining', String(res.remainingPoints));
    response.headers.set(
      'X-RateLimit-Reset',
      String(Date.now() + res.msBeforeNext)
    );

    return { success: false, response };
  }
}

/** Headers commonly used by platforms to forward client IP (in priority order). */
const IP_HEADERS = [
  'x-forwarded-for', // Standard; first entry is client (Vercel, nginx, etc.)
  'x-real-ip',
  'cf-connecting-ip', // Cloudflare
  'x-vercel-forwarded-for', // Vercel
] as const;

export function getClientIdentifier(request: NextRequest): string {
  for (const name of IP_HEADERS) {
    const value = request.headers.get(name);
    if (!value) continue;
    // x-forwarded-for can be "client, proxy1, proxy2" — client is first
    const clientIp = value.split(',')[0].trim();
    if (clientIp) return clientIp;
  }
  return 'unknown';
}

// Middleware helper
export async function withRateLimit(
  request: NextRequest,
  type: RateLimiterType,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const rateLimitCheck = await checkRateLimit(request, type);

  if (!rateLimitCheck.success) {
    return rateLimitCheck.response!;
  }

  return handler();
}

// Check if IP is suspicious (too many failed attempts)
const failedAttempts = new Map<
  string,
  { count: number; lastAttempt: number }
>();

export function trackFailedAttempt(identifier: string): boolean {
  const now = Date.now();
  const record = failedAttempts.get(identifier);

  if (!record) {
    failedAttempts.set(identifier, { count: 1, lastAttempt: now });
    return false;
  }

  // Reset if more than 1 hour has passed
  if (now - record.lastAttempt > 60 * 60 * 1000) {
    failedAttempts.set(identifier, { count: 1, lastAttempt: now });
    return false;
  }

  record.count++;
  record.lastAttempt = now;

  // Flag as suspicious after 10 failed attempts in an hour
  if (record.count >= 10) {
    logger.warn('Suspicious activity: Multiple failed attempts', {
      identifier,
      attempts: record.count,
    });
    return true;
  }

  return false;
}

export function clearFailedAttempts(identifier: string): void {
  failedAttempts.delete(identifier);
}

// Cleanup old entries every hour
setInterval(
  () => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    for (const [identifier, record] of failedAttempts.entries()) {
      if (record.lastAttempt < oneHourAgo) {
        failedAttempts.delete(identifier);
      }
    }
  },
  60 * 60 * 1000
);
