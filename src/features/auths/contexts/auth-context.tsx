'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import { useRegisterSessionExpired } from '@/hooks/useRegisterSessionExpired';
import { SESSION_EXISTS_COOKIE_NAME } from '@/lib/auth-cookies';
import { api } from '@/lib/api-client';
import { getCookie } from '@/utils/cookie-storage';
import { useRouter } from 'next/navigation';

// --- Types (exported for consumers) ---

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface IUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  roles: string[];
  permissions: IPermission[];
}

export interface IPermission {
  resource: string;
  action: string;
  name: string;
}

export interface IAuthState {
  user: IUser | null;
  loading: boolean;
  error: string | null;
}

/** NextAuth/Better Auth–style session: status + data. */
export interface ISession {
  user: IUser;
}

export interface IAuthContextType {
  /** Current session status. Use this for all loading/redirect logic. */
  status: AuthStatus;
  /** User when authenticated, null otherwise. Same as state.user. */
  data: IUser | null;
  /** Last auth error (login/register failure, session fetch failure). */
  error: string | null;
  /** True while status === 'loading'. */
  isLoading: boolean;
  /** True when status === 'authenticated'. */
  isAuthenticated: boolean;
  /** Raw state (backward compat). Prefer status + data. */
  state: IAuthState;

  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  handleLogin: (email: string, password: string) => Promise<void>;
  handleRegister: (
    email: string,
    password: string,
    name?: string
  ) => Promise<void>;
  handleLogout: () => Promise<void>;
  handleUpdateUser: (user: IUser) => void;

  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (roleNames: string[]) => boolean;
  hasAnyPermission: (
    permissions: Array<{ resource: string; action: string }>
  ) => boolean;
  hasAllPermissions: (
    permissions: Array<{ resource: string; action: string }>
  ) => boolean;
}

// --- Reducer ---

type IAuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: IUser }
  | { type: 'LOGIN_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: IUser };

export const initialAuthState: IAuthState = {
  user: null,
  loading: false,
  error: null,
};

export function authReducer(
  state: IAuthState,
  action: IAuthAction
): IAuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return { user: action.payload, loading: false, error: null };
    case 'LOGIN_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'LOGOUT':
      return { user: null, loading: false, error: null };
    case 'UPDATE_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
}

// --- Context ---

const AuthContext = createContext<IAuthContextType | undefined>(undefined);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const router = useRouter();

  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';
  const data = state.user;

  const clearAuthAndCookies = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      dispatch({ type: 'LOGOUT' });
      setStatus('unauthenticated');
    }
  }, []);

  useRegisterSessionExpired(() => {
    clearAuthAndCookies();
    router.push('/login');
  });

  const fetchUser = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await api.get<{ user: IUser }>('/api/auth/me');
      dispatch({ type: 'LOGIN_SUCCESS', payload: data.user });
      setStatus('authenticated');
    } catch (e) {
      console.error('Failed to fetch user:', e);
      await clearAuthAndCookies();
      setStatus('unauthenticated');
    }
  }, [clearAuthAndCookies]);

  // Single init effect: session_exists cookie → fetch session; otherwise unauthenticated.
  // Prod-safe: runs in useEffect (client-only). getCookie() guards document; we only read
  // a non-secret flag (session_exists). Real auth is httpOnly access_token + /api/auth/me.
  useEffect(() => {
    if (state.user) {
      setStatus('authenticated');
      return;
    }
    const hasSessionCookie = getCookie(SESSION_EXISTS_COOKIE_NAME);
    if (!hasSessionCookie) {
      setStatus('unauthenticated');
      return;
    }
    fetchUser();
  }, [fetchUser, state.user]);

  const hasRole = useCallback(
    (roleNames: string[]): boolean => {
      if (!state.user) return false;
      return state.user.roles.some(role => roleNames.includes(role));
    },
    [state.user]
  );

  const hasPermission = useCallback(
    (resource: string, action: string): boolean => {
      if (!state.user) return false;
      return state.user.permissions.some(
        p => p.resource === resource && p.action === action
      );
    },
    [state.user]
  );

  const hasAnyPermission = useCallback(
    (permissions: Array<{ resource: string; action: string }>): boolean => {
      if (!state.user) return false;
      return permissions.some(perm =>
        state.user?.permissions.some(
          p => p.resource === perm.resource && p.action === perm.action
        )
      );
    },
    [state.user]
  );

  const hasAllPermissions = useCallback(
    (permissions: Array<{ resource: string; action: string }>): boolean => {
      if (!state.user) return false;
      return permissions.every(perm =>
        state.user?.permissions.some(
          p => p.resource === perm.resource && p.action === perm.action
        )
      );
    },
    [state.user]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      setStatus('loading');
      dispatch({ type: 'LOGIN_START' });
      try {
        const data = await api.post<{ user: IUser }>('/api/auth/login', {
          email,
          password,
        });
        dispatch({ type: 'LOGIN_SUCCESS', payload: data.user });
        setStatus('authenticated');
        router.push('/dashboard');
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Login failed';
        dispatch({ type: 'LOGIN_ERROR', payload: message });
        setStatus('unauthenticated');
        throw e instanceof Error ? e : new Error('Login failed');
      }
    },
    [router]
  );

  const signOut = useCallback(async () => {
    await clearAuthAndCookies();
  }, [clearAuthAndCookies]);

  const handleLogin = signIn;
  const handleLogout = signOut;

  const handleRegister = useCallback(
    async (email: string, password: string, name?: string) => {
      try {
        await api.post('/api/auth/register', { email, password, name });
        await fetchUser();
      } catch {
        // Registration failed; caller can handle
      }
    },
    [fetchUser]
  );

  const handleUpdateUser = useCallback((user: IUser) => {
    dispatch({ type: 'UPDATE_USER', payload: user });
  }, []);

  const value = useMemo<IAuthContextType>(
    () => ({
      status,
      data,
      error: state.error,
      isLoading,
      isAuthenticated,
      state,
      signIn,
      signOut,
      handleLogin,
      handleRegister,
      handleLogout,
      handleUpdateUser,
      hasPermission,
      hasRole,
      hasAnyPermission,
      hasAllPermissions,
    }),
    [
      status,
      data,
      state,
      isLoading,
      isAuthenticated,
      signIn,
      signOut,
      handleLogin,
      handleRegister,
      handleLogout,
      handleUpdateUser,
      hasPermission,
      hasRole,
      hasAnyPermission,
      hasAllPermissions,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

function useAuthContext(): IAuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error('useAuthContext must be used within an AuthProvider');
  return ctx;
}

/** NextAuth-style hook: returns { data, status }. */
function useSession(): {
  data: IUser | null;
  status: AuthStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
} {
  const { data, status, isLoading, isAuthenticated, error } = useAuthContext();
  return { data, status, isLoading, isAuthenticated, error };
}

export { AuthProvider, useAuthContext, useSession };
