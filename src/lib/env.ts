import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Authentication
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // CSRF Protection
  CSRF_SECRET: z.string().min(32, 'CSRF_SECRET must be at least 32 characters'),

  // Environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Application
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  PORT: z.string().default('3000'),

  // Rate Limiting
  RATE_LIMIT_MAX: z.string().default('100'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'), // 15 minutes

  // Session
  SESSION_MAX_AGE: z.string().default('604800'), // 7 days in seconds
  MAX_SESSIONS_PER_USER: z.string().default('5'),

  // Monitoring (optional in development)
  SENTRY_DSN: z.string().optional(),

  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type Environment = z.infer<typeof envSchema>;

export function validateEnv(): Environment {
  try {
    const env = envSchema.parse(process.env);

    // Additional production checks
    if (env.NODE_ENV === 'production') {
      if (env.JWT_SECRET.length < 64) {
        console.warn(
          '⚠️  WARNING: JWT_SECRET should be at least 64 characters in production'
        );
      }

      if (env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
        throw new Error(
          'NEXT_PUBLIC_APP_URL cannot contain localhost in production'
        );
      }

      if (!env.SENTRY_DSN) {
        console.warn(
          '⚠️  WARNING: SENTRY_DSN not set - error tracking disabled'
        );
      }
    }

    console.log('✅ Environment variables validated successfully');
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.issues.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error('❌ Environment validation error:', error);
    }
    process.exit(1);
  }
}

// Validate on import
export const env = validateEnv();
