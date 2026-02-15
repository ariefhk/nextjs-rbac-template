'use client';

// import { api } from '@/lib/api-client';
import { hasAccessTokenCookie } from '@/lib/auth-cookies';
import { useEffect, useState } from 'react';

interface Permission {
  resource: string;
  action: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  roles: string[];
  permissions: Permission[];
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasAccessTokenCookie()) {
      setUser(null);
      setLoading(false);
      return;
    }
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
      // const response = await api.get<User>('/api/auth/me');
      // setUser(response);
      // console.log('response', response);
      // const response = await api.get<User>('/api/auth/me');
      // setUser(response);
      // console.log('response', response);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (resource: string, action: string): boolean => {
    if (!user) return false;
    return user.permissions.some(
      p => p.resource === resource && p.action === action
    );
  };

  const hasAnyPermission = (
    permissions: Array<{ resource: string; action: string }>
  ): boolean => {
    if (!user) return false;
    return permissions.some(perm =>
      user.permissions.some(
        p => p.resource === perm.resource && p.action === perm.action
      )
    );
  };

  const hasAllPermissions = (
    permissions: Array<{ resource: string; action: string }>
  ): boolean => {
    if (!user) return false;
    return permissions.every(perm =>
      user.permissions.some(
        p => p.resource === perm.resource && p.action === perm.action
      )
    );
  };

  const hasRole = (roleNames: string[]): boolean => {
    if (!user) return false;
    return user.roles.some(role => roleNames.includes(role));
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    await fetchUser();
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  const register = async (email: string, password: string, name?: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    return response.json();
  };

  return {
    user,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    login,
    logout,
    register,
  };
}
