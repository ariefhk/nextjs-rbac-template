const getEnv = () => {
  // For client-side, check NEXT_PUBLIC_ or fallback to NODE_ENV
  if (typeof window !== 'undefined') {
    return process?.env?.NEXT_PUBLIC_APP_ENV || process?.env?.NODE_ENV;
  }
  return process?.env?.NODE_ENV;
};

const env = getEnv();

export const APP_CONFIG = {
  ENV: env,
  IS_DEV: env === 'development',
  IS_PROD: env === 'production',
  IS_TEST: env === 'test',
  IS_CLIENT: typeof window !== 'undefined',
  IS_SERVER: typeof window === 'undefined',
} as const;
