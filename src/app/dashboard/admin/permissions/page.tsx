'use client';

import { PermissionGuard } from '@/components/PermissionGuard';
import { api } from '@/lib/api-client';
import { useEffect, useState } from 'react';

const RESOURCES = [
  'users',
  'posts',
  'comments',
  'roles',
  'permissions',
] as const;
const ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'manage',
  'assign_role',
  'remove_role',
] as const;

type Permission = {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string | null;
};

export default function AdminPermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    resource: 'users',
    action: 'read',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    resource: '',
    action: '',
    description: '',
  });

  const fetchPermissions = async () => {
    try {
      const data = await api.get<{ permissions: Permission[] }>(
        '/api/permissions'
      );
      setPermissions(data.permissions ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load permissions.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/api/permissions', {
        resource: form.resource,
        action: form.action,
        description: form.description || undefined,
      });
      setForm({ resource: 'users', action: 'read', description: '' });
      await fetchPermissions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create permission.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.patch(`/api/permissions/${editingId}`, {
        resource: editForm.resource || undefined,
        action: editForm.action || undefined,
        description:
          editForm.description !== undefined ? editForm.description : undefined,
      });
      setEditingId(null);
      await fetchPermissions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update permission.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this permission?')) return;
    setError(null);
    try {
      await api.delete(`/api/permissions/${id}`);
      await fetchPermissions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete permission.'
      );
    }
  };

  const startEdit = (p: Permission) => {
    setEditingId(p.id);
    setEditForm({
      resource: p.resource,
      action: p.action,
      description: p.description ?? '',
    });
  };

  return (
    <PermissionGuard
      resource="permissions"
      action="read"
      fallback={
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-amber-800">
          You do not have permission to view this page.
        </div>
      }
    >
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Permissions</h1>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <PermissionGuard resource="permissions" action="create" fallback={null}>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Create Permission</h2>
            <form
              onSubmit={handleCreate}
              className="flex flex-wrap gap-4 items-end"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resource
                </label>
                <select
                  value={form.resource}
                  onChange={e =>
                    setForm(f => ({ ...f, resource: e.target.value }))
                  }
                  className="border border-gray-300 rounded px-3 py-2"
                >
                  {RESOURCES.map(r => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action
                </label>
                <select
                  value={form.action}
                  onChange={e =>
                    setForm(f => ({ ...f, action: e.target.value }))
                  }
                  className="border border-gray-300 rounded px-3 py-2"
                >
                  {ACTIONS.map(a => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e =>
                    setForm(f => ({ ...f, description: e.target.value }))
                  }
                  className="border border-gray-300 rounded px-3 py-2 w-48"
                  placeholder="e.g. Create users"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </form>
          </div>
        </PermissionGuard>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">All Permissions</h2>
          </div>
          {loading ? (
            <div className="p-6 text-gray-500">Loading...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {permissions.map(p => (
                  <tr key={p.id}>
                    {editingId === p.id ? (
                      <>
                        <td colSpan={5} className="px-6 py-4 bg-gray-50">
                          <form
                            onSubmit={handleUpdate}
                            className="flex flex-wrap gap-4 items-end"
                          >
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Resource
                              </label>
                              <select
                                value={editForm.resource}
                                onChange={e =>
                                  setEditForm(f => ({
                                    ...f,
                                    resource: e.target.value,
                                  }))
                                }
                                className="border border-gray-300 rounded px-3 py-2"
                              >
                                {RESOURCES.map(r => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Action
                              </label>
                              <select
                                value={editForm.action}
                                onChange={e =>
                                  setEditForm(f => ({
                                    ...f,
                                    action: e.target.value,
                                  }))
                                }
                                className="border border-gray-300 rounded px-3 py-2"
                              >
                                {ACTIONS.map(a => (
                                  <option key={a} value={a}>
                                    {a}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                              </label>
                              <input
                                type="text"
                                value={editForm.description}
                                onChange={e =>
                                  setEditForm(f => ({
                                    ...f,
                                    description: e.target.value,
                                  }))
                                }
                                className="border border-gray-300 rounded px-3 py-2 w-48"
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={submitting}
                              className="px-3 py-2 bg-indigo-600 text-white rounded text-sm"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-3 py-2 bg-gray-200 rounded text-sm"
                            >
                              Cancel
                            </button>
                          </form>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {p.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {p.resource}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {p.action}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {p.description ?? '—'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          <PermissionGuard
                            resource="permissions"
                            action="update"
                            fallback={null}
                          >
                            <button
                              type="button"
                              onClick={() => startEdit(p)}
                              className="text-indigo-600 hover:underline mr-2"
                            >
                              Edit
                            </button>
                          </PermissionGuard>
                          <PermissionGuard
                            resource="permissions"
                            action="delete"
                            fallback={null}
                          >
                            <button
                              type="button"
                              onClick={() => handleDelete(p.id)}
                              className="text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </PermissionGuard>
                        </td>
                      </>
                    )}
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
