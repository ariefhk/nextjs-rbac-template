'use client';

import { PermissionGuard } from '@/components/PermissionGuard';
import { useEffect, useState } from 'react';

type User = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  roles: { id: string; name: string }[];
};

type Role = { id: string; name: string };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) {
        if (res.status === 403)
          setError('You do not have permission to view users.');
        else setError('Failed to load users.');
        return;
      }
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles ?? []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleAssignRole = async (userId: string, roleId: string) => {
    setError(null);
    try {
      const res = await fetch('/api/users/assign-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign role');
      setAssigningUserId(null);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign role.');
    }
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    setError(null);
    try {
      const res = await fetch('/api/users/assign-role', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove role');
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove role.');
    }
  };

  const userRoleIds = (user: User) => user.roles.map(r => r.id);

  return (
    <PermissionGuard
      resource="users"
      action="read"
      fallback={
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-amber-800">
          You do not have permission to view this page.
        </div>
      }
    >
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">All Users</h2>
          </div>
          {loading ? (
            <div className="p-6 text-gray-500">Loading...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Roles
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map(user => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.name ?? '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {user.roles.map(role => (
                          <span
                            key={role.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-700"
                          >
                            {role.name}
                            <PermissionGuard
                              resource="users"
                              action="remove_role"
                              fallback={null}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveRole(user.id, role.id)
                                }
                                className="text-red-500 hover:text-red-700"
                                aria-label={`Remove ${role.name}`}
                              >
                                ×
                              </button>
                            </PermissionGuard>
                          </span>
                        ))}
                      </div>
                      <PermissionGuard
                        resource="users"
                        action="assign_role"
                        fallback={null}
                      >
                        <div className="mt-2">
                          {assigningUserId === user.id ? (
                            <div className="flex flex-wrap gap-2 items-center">
                              <select
                                className="border border-gray-300 rounded px-2 py-1 text-sm"
                                onChange={e => {
                                  const roleId = e.target.value;
                                  if (roleId) {
                                    handleAssignRole(user.id, roleId);
                                    e.target.value = '';
                                  }
                                }}
                              >
                                <option value="">Add role...</option>
                                {roles
                                  .filter(
                                    r => !userRoleIds(user).includes(r.id)
                                  )
                                  .map(r => (
                                    <option key={r.id} value={r.id}>
                                      {r.name}
                                    </option>
                                  ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => setAssigningUserId(null)}
                                className="text-sm text-gray-600 hover:underline"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAssigningUserId(user.id)}
                              className="text-sm text-indigo-600 hover:underline"
                            >
                              + Assign role
                            </button>
                          )}
                        </div>
                      </PermissionGuard>
                    </td>
                    <td className="px-6 py-4 text-right text-sm">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PermissionGuard>
  );
}
