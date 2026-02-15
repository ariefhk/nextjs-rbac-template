'use client';

import { useAuthContext } from '@/features/auths/contexts/auth-context';
import { ReactNode } from 'react';

interface PermissionGuardProps {
  children: ReactNode;
  /** Single permission (use when not passing permissions array) */
  resource?: string;
  action?: string;
  fallback?: ReactNode;
  requireAll?: boolean;
  /** Multiple permissions (takes precedence over resource/action) */
  permissions?: Array<{ resource: string; action: string }>;
}

export function PermissionGuard({
  children,
  resource,
  action,
  fallback = null,
  requireAll = false,
  permissions,
}: PermissionGuardProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission, isLoading } =
    useAuthContext();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Check multiple permissions if provided
  if (permissions && permissions.length > 0) {
    const hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasAccess) {
      return <>{fallback}</>;
    }

    return <>{children}</>;
  }

  // Check single permission (resource and action must both be provided)
  if (resource != null && action != null) {
    if (!hasPermission(resource, action)) {
      return <>{fallback}</>;
    }
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

interface RoleGuardProps {
  children: ReactNode;
  roles: string[];
  fallback?: ReactNode;
}

export function RoleGuard({
  children,
  roles,
  fallback = null,
}: RoleGuardProps) {
  const { hasRole, isLoading } = useAuthContext();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!hasRole(roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({ children, fallback = null }: AuthGuardProps) {
  const { data, isLoading } = useAuthContext();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!data) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
