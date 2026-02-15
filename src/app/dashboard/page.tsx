'use client';

import { PermissionGuard, RoleGuard } from '@/components/PermissionGuard';
import { useAuthContext } from '@/features/auths/contexts/auth-context';

export default function DashboardPage() {
  const { state } = useAuthContext();

  console.log('state pages: ', state);

  if (!state.user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* User Info */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">User Information</h2>
        <div className="space-y-2">
          <p>
            <strong>Email:</strong> {state.user.email}
          </p>
          <p>
            <strong>Name:</strong> {state.user.name || 'N/A'}
          </p>
          <p>
            <strong>Roles:</strong> {state.user.roles.join(', ')}
          </p>
          <div>
            <strong>Permissions:</strong>
            <ul className="mt-2 space-y-1">
              {state.user.permissions.map(p => (
                <li key={p.name} className="text-sm text-gray-600">
                  {p.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Admin Only Section */}
      <RoleGuard
        roles={['admin']}
        fallback={
          <div className="bg-gray-100 p-6 rounded-lg border border-gray-300">
            <p className="text-gray-600">
              Admin section - You don&apos;t have access
            </p>
          </div>
        }
      >
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h2 className="text-lg font-semibold mb-2 text-blue-900">
            Admin Section
          </h2>
          <p className="text-blue-700">
            This section is only visible to administrators.
          </p>
        </div>
      </RoleGuard>

      {/* User Management Section */}
      <PermissionGuard
        resource="users"
        action="read"
        fallback={
          <div className="bg-gray-100 p-6 rounded-lg border border-gray-300">
            <p className="text-gray-600">
              User management - You don&apos;t have permission
            </p>
          </div>
        }
      >
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <h2 className="text-lg font-semibold mb-2 text-green-900">
            User Management
          </h2>
          <p className="text-green-700">You have permission to view users.</p>

          <PermissionGuard
            resource="users"
            action="create"
            fallback={
              <p className="mt-2 text-sm text-gray-600">
                (You cannot create users)
              </p>
            }
          >
            <button className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              Create New User
            </button>
          </PermissionGuard>
        </div>
      </PermissionGuard>

      {/* Content Management Section */}
      <PermissionGuard
        permissions={[
          { resource: 'posts', action: 'create' },
          { resource: 'posts', action: 'update' },
        ]}
        requireAll={false}
        fallback={
          <div className="bg-gray-100 p-6 rounded-lg border border-gray-300">
            <p className="text-gray-600">
              Content management - You don&apos;t have permission
            </p>
          </div>
        }
      >
        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
          <h2 className="text-lg font-semibold mb-2 text-purple-900">
            Content Management
          </h2>
          <p className="text-purple-700">You can create or update posts.</p>
        </div>
      </PermissionGuard>
    </div>
  );
}
