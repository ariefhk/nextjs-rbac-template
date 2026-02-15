'use client';

import { PermissionGuard } from '@/components/PermissionGuard';
import { useEffect, useState } from 'react';

type Role = {
  id: string;
  name: string;
  description: string | null;
  permissions: {
    permission: { id: string; name: string; resource: string; action: string };
  }[];
  _count?: { users: number };
};

type Permission = {
  id: string;
  name: string;
  resource: string;
  action: string;
};

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [assigningRoleId, setAssigningRoleId] = useState<string | null>(null);

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles');
      if (!res.ok) {
        if (res.status === 403)
          setError('You do not have permission to view roles.');
        else setError('Failed to load roles.');
        return;
      }
      const data = await res.json();
      setRoles(data.roles ?? []);
    } catch {
      setError('Failed to load roles.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await fetch('/api/permissions');
      if (res.ok) {
        const data = await res.json();
        setPermissions(data.permissions ?? []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      setForm({ name: '', description: '' });
      await fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create role.');
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
      const res = await fetch(`/api/roles/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name || undefined,
          description:
            editForm.description !== undefined
              ? editForm.description
              : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      setEditingId(null);
      await fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this role? Users will lose this role.')) return;
    setError(null);
    try {
      const res = await fetch(`/api/roles/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      await fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete role.');
    }
  };

  const handleAssignPermission = async (
    roleId: string,
    permissionId: string
  ) => {
    setError(null);
    try {
      const res = await fetch(`/api/roles/${roleId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign');
      setAssigningRoleId(null);
      await fetchRoles();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to assign permission.'
      );
    }
  };

  const handleRemovePermission = async (
    roleId: string,
    permissionId: string
  ) => {
    setError(null);
    try {
      const res = await fetch(
        `/api/roles/${roleId}/permissions?permissionId=${permissionId}`,
        {
          method: 'DELETE',
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove');
      await fetchRoles();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to remove permission.'
      );
    }
  };

  const startEdit = (r: Role) => {
    setEditingId(r.id);
    setEditForm({ name: r.name, description: r.description ?? '' });
  };

  const rolePermissionIds = (role: Role) =>
    role.permissions.map(rp => rp.permission.id);

  return (
    <PermissionGuard
      resource="roles"
      action="read"
      fallback={
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-amber-800">
          You do not have permission to view this page.
        </div>
      }
    >
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Roles</h1>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <PermissionGuard resource="roles" action="create" fallback={null}>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Create Role</h2>
            <form
              onSubmit={handleCreate}
              className="flex flex-wrap gap-4 items-end"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  className="border border-gray-300 rounded px-3 py-2"
                  placeholder="e.g. editor"
                />
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
                  className="border border-gray-300 rounded px-3 py-2 w-64"
                  placeholder="Can edit content"
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
            <h2 className="text-lg font-semibold">All Roles</h2>
          </div>
          {loading ? (
            <div className="p-6 text-gray-500">Loading...</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {roles.map(role => (
                <div key={role.id} className="px-6 py-4">
                  {editingId === role.id ? (
                    <form
                      onSubmit={handleUpdate}
                      className="flex flex-wrap gap-4 items-end"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={e =>
                            setEditForm(f => ({ ...f, name: e.target.value }))
                          }
                          required
                          className="border border-gray-300 rounded px-3 py-2"
                        />
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
                          className="border border-gray-300 rounded px-3 py-2 w-64"
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
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {role.name}
                        </h3>
                        {role.description && (
                          <p className="text-sm text-gray-500 mt-1">
                            {role.description}
                          </p>
                        )}
                        {role._count != null && (
                          <p className="text-xs text-gray-400 mt-1">
                            {role._count.users} user(s)
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {role.permissions.map(rp => (
                            <span
                              key={rp.permission.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-700"
                            >
                              {rp.permission.name}
                              <PermissionGuard
                                resource="roles"
                                action="update"
                                fallback={null}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemovePermission(
                                      role.id,
                                      rp.permission.id
                                    )
                                  }
                                  className="text-red-500 hover:text-red-700"
                                  aria-label="Remove"
                                >
                                  ×
                                </button>
                              </PermissionGuard>
                            </span>
                          ))}
                        </div>
                        <PermissionGuard
                          resource="roles"
                          action="update"
                          fallback={null}
                        >
                          <div className="mt-2">
                            {assigningRoleId === role.id ? (
                              <div className="flex flex-wrap gap-2 items-center">
                                <select
                                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                                  onChange={e => {
                                    const pid = e.target.value;
                                    if (pid) {
                                      handleAssignPermission(role.id, pid);
                                      e.target.value = '';
                                    }
                                  }}
                                >
                                  <option value="">Add permission...</option>
                                  {permissions
                                    .filter(
                                      p =>
                                        !rolePermissionIds(role).includes(p.id)
                                    )
                                    .map(p => (
                                      <option key={p.id} value={p.id}>
                                        {p.name}
                                      </option>
                                    ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => setAssigningRoleId(null)}
                                  className="text-sm text-gray-600 hover:underline"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setAssigningRoleId(role.id)}
                                className="text-sm text-indigo-600 hover:underline"
                              >
                                + Add permission
                              </button>
                            )}
                          </div>
                        </PermissionGuard>
                      </div>
                      <div className="flex gap-2">
                        <PermissionGuard
                          resource="roles"
                          action="update"
                          fallback={null}
                        >
                          <button
                            type="button"
                            onClick={() => startEdit(role)}
                            className="px-3 py-1 text-sm text-indigo-600 hover:underline"
                          >
                            Edit
                          </button>
                        </PermissionGuard>
                        <PermissionGuard
                          resource="roles"
                          action="delete"
                          fallback={null}
                        >
                          <button
                            type="button"
                            onClick={() => handleDelete(role.id)}
                            className="px-3 py-1 text-sm text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </PermissionGuard>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PermissionGuard>
  );
}
