import { prisma } from '@/lib/prisma';

// ─── Type-safe resource & action (single source of truth) ───────────────────
export const RESOURCES = [
  'users',
  'posts',
  'comments',
  'roles',
  'permissions',
] as const;

export const ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'manage',
  'assign_role',
  'remove_role',
] as const;

export type Resource = (typeof RESOURCES)[number];
export type Action = (typeof ACTIONS)[number];

export type PermissionInput = { resource: Resource; action: Action };

/** Get all possible resources for type-safe usage (e.g. in forms or checks). */
export function getPossibleResources(): readonly Resource[] {
  return RESOURCES;
}

/** Get all possible actions for type-safe usage (e.g. in forms or checks). */
export function getPossibleActions(): readonly Action[] {
  return ACTIONS;
}

/** Get possible resource–action pairs for type-safe permission definitions. */
export function getPossibleResourceActions(): PermissionInput[] {
  return RESOURCES.flatMap(resource =>
    ACTIONS.map(action => ({ resource, action }))
  );
}

// ─── User with roles (unchanged) ────────────────────────────────────────────
export interface UserWithRoles {
  id: string;
  email: string;
  name: string | null;
  roles: Array<{
    role: {
      id: string;
      name: string;
      permissions: Array<{
        permission: {
          id: string;
          name: string;
          resource: string;
          action: string;
        };
      }>;
    };
  }>;
}

export class RBACService {
  /**
   * Get user with all roles and permissions
   */
  static async getUserWithPermissions(
    userId: string
  ): Promise<UserWithRoles | null> {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Check if user has specific permission
   */
  static async hasPermission(
    userId: string,
    resource: Resource,
    action: Action
  ): Promise<boolean> {
    const user = await this.getUserWithPermissions(userId);
    if (!user) return false;

    return user.roles.some(userRole =>
      userRole.role.permissions.some(
        rp =>
          rp.permission.resource === resource && rp.permission.action === action
      )
    );
  }

  /**
   * Check if user has any of the specified roles
   */
  static async hasRole(userId: string, roleNames: string[]): Promise<boolean> {
    const user = await this.getUserWithPermissions(userId);
    if (!user) return false;

    return user.roles.some(userRole => roleNames.includes(userRole.role.name));
  }

  /**
   * Check if user has all specified permissions
   */
  static async hasAllPermissions(
    userId: string,
    permissions: PermissionInput[]
  ): Promise<boolean> {
    const user = await this.getUserWithPermissions(userId);
    if (!user) return false;

    const userPermissions = this.extractPermissions(user);

    return permissions.every(perm =>
      userPermissions.some(
        up => up.resource === perm.resource && up.action === perm.action
      )
    );
  }

  /**
   * Check if user has any of the specified permissions
   */
  static async hasAnyPermission(
    userId: string,
    permissions: PermissionInput[]
  ): Promise<boolean> {
    const user = await this.getUserWithPermissions(userId);
    if (!user) return false;

    const userPermissions = this.extractPermissions(user);

    return permissions.some(perm =>
      userPermissions.some(
        up => up.resource === perm.resource && up.action === perm.action
      )
    );
  }

  /**
   * Assign role to user
   */
  static async assignRole(
    userId: string,
    roleId: string,
    assignedBy?: string
  ): Promise<void> {
    await prisma.userRole.create({
      data: {
        userId,
        roleId,
        assignedBy,
      },
    });
  }

  /**
   * Remove role from user
   */
  static async removeRole(userId: string, roleId: string): Promise<void> {
    await prisma.userRole.deleteMany({
      where: {
        userId,
        roleId,
      },
    });
  }

  /**
   * Assign permission to role
   */
  static async assignPermissionToRole(
    roleId: string,
    permissionId: string
  ): Promise<void> {
    await prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
      },
    });
  }

  /**
   * Get all permissions for a user (flattened)
   */
  static extractPermissions(user: UserWithRoles): Array<{
    resource: string;
    action: string;
    name: string;
  }> {
    const permissions: Array<{
      resource: string;
      action: string;
      name: string;
    }> = [];

    user.roles.forEach(userRole => {
      userRole.role.permissions.forEach(rp => {
        permissions.push({
          resource: rp.permission.resource,
          action: rp.permission.action,
          name: rp.permission.name,
        });
      });
    });

    // Remove duplicates
    return Array.from(new Map(permissions.map(p => [p.name, p])).values());
  }

  /**
   * Create a new role
   */
  static async createRole(name: string, description?: string) {
    return await prisma.role.create({
      data: {
        name,
        description,
      },
    });
  }

  /**
   * Create a new permission
   */
  static async createPermission(
    resource: Resource,
    action: Action,
    description?: string
  ) {
    return await prisma.permission.create({
      data: {
        name: `${resource}:${action}`,
        resource,
        action,
        description,
      },
    });
  }

  /**
   * Remove permission from role
   */
  static async removePermissionFromRole(
    roleId: string,
    permissionId: string
  ): Promise<void> {
    await prisma.rolePermission.deleteMany({
      where: { roleId, permissionId },
    });
  }

  /**
   * Update role
   */
  static async updateRole(
    id: string,
    data: { name?: string; description?: string }
  ) {
    return await prisma.role.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete role
   */
  static async deleteRole(id: string): Promise<void> {
    await prisma.role.delete({ where: { id } });
  }

  /**
   * Get all permissions
   */
  static async getAllPermissions() {
    return await prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  /**
   * Update permission
   */
  static async updatePermission(
    id: string,
    data: { resource?: Resource; action?: Action; description?: string }
  ) {
    const update: {
      name?: string;
      resource?: string;
      action?: string;
      description?: string;
    } = { ...data };
    if (data.resource != null && data.action != null) {
      update.name = `${data.resource}:${data.action}`;
      update.resource = data.resource;
      update.action = data.action;
    }
    return await prisma.permission.update({
      where: { id },
      data: update,
    });
  }

  /**
   * Delete permission
   */
  static async deletePermission(id: string): Promise<void> {
    await prisma.permission.delete({ where: { id } });
  }
}
