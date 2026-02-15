'use client';

import { useAuthContext } from '@/features/auths/contexts/auth-context';
import { triggerSessionExpiredForTesting } from '@/lib/api-client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    status,
    data,
    handleLogout: handleLogoutContext,
    hasPermission,
  } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !data) {
    return null; // Redirect in progress
  }

  const handleLogout = async () => {
    await handleLogoutContext();
    router.push('/login');
  };

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-3 py-2 rounded text-sm font-medium ${
        pathname === href
          ? 'bg-gray-200 text-gray-900'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
              <div className="flex items-center gap-1">
                {navLink('/dashboard', 'Home')}
                {hasPermission('permissions', 'read') &&
                  navLink('/dashboard/admin/permissions', 'Permissions')}
                {hasPermission('roles', 'read') &&
                  navLink('/dashboard/admin/roles', 'Roles')}
                {hasPermission('users', 'read') &&
                  navLink('/dashboard/admin/users', 'Users')}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{data.email}</span>
              {process.env.NODE_ENV === 'development' && (
                <button
                  type="button"
                  onClick={triggerSessionExpiredForTesting}
                  className="px-3 py-1.5 text-xs text-amber-700 bg-amber-100 rounded hover:bg-amber-200"
                  title="Simulate 401 + refresh failed (clears auth, redirects to login)"
                >
                  Test: Session expired
                </button>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
