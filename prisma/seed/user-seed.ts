import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function userSeed() {
  console.log('Starting database seed...');

  // Create Permissions
  const permissions = [
    // User permissions
    { resource: 'users', action: 'create', description: 'Create new users' },
    { resource: 'users', action: 'read', description: 'View users' },
    {
      resource: 'users',
      action: 'update',
      description: 'Update user information',
    },
    { resource: 'users', action: 'delete', description: 'Delete users' },
    {
      resource: 'users',
      action: 'assign_role',
      description: 'Assign roles to users',
    },
    {
      resource: 'users',
      action: 'remove_role',
      description: 'Remove roles from users',
    },

    // Role permissions
    { resource: 'roles', action: 'create', description: 'Create new roles' },
    { resource: 'roles', action: 'read', description: 'View roles' },
    { resource: 'roles', action: 'update', description: 'Update roles' },
    { resource: 'roles', action: 'delete', description: 'Delete roles' },

    // Permission permissions
    {
      resource: 'permissions',
      action: 'create',
      description: 'Create new permissions',
    },
    {
      resource: 'permissions',
      action: 'read',
      description: 'View permissions',
    },
    {
      resource: 'permissions',
      action: 'update',
      description: 'Update permissions',
    },
    {
      resource: 'permissions',
      action: 'delete',
      description: 'Delete permissions',
    },

    // Post permissions (example resource)
    { resource: 'posts', action: 'create', description: 'Create posts' },
    { resource: 'posts', action: 'read', description: 'View posts' },
    { resource: 'posts', action: 'update', description: 'Update posts' },
    { resource: 'posts', action: 'delete', description: 'Delete posts' },
    { resource: 'posts', action: 'publish', description: 'Publish posts' },

    // Admin permissions
    { resource: 'admin', action: 'access', description: 'Access admin panel' },
  ];

  console.log('Creating permissions...');
  const createdPermissions = [];
  for (const perm of permissions) {
    const permission = await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: perm.resource,
          action: perm.action,
        },
      },
      update: {},
      create: {
        name: `${perm.resource}:${perm.action}`,
        ...perm,
      },
    });
    createdPermissions.push(permission);
    console.log(`Created permission: ${permission.name}`);
  }

  // Create Roles
  console.log('\nCreating roles...');

  // Admin Role - Full access
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrator with full access',
    },
  });
  console.log('Created role: admin');

  // Moderator Role - Limited admin access
  const moderatorRole = await prisma.role.upsert({
    where: { name: 'moderator' },
    update: {},
    create: {
      name: 'moderator',
      description: 'Moderator with content management access',
    },
  });
  console.log('Created role: moderator');

  // User Role - Basic access
  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: {
      name: 'user',
      description: 'Regular user with basic access',
    },
  });
  console.log('Created role: user');

  // Assign Permissions to Roles
  console.log('\nAssigning permissions to roles...');

  // Admin gets all permissions
  for (const permission of createdPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }
  console.log('Assigned all permissions to admin role');

  // Moderator gets content and read permissions
  const moderatorPermissions = createdPermissions.filter(
    p =>
      p.resource === 'posts' ||
      (p.resource === 'users' && p.action === 'read') ||
      (p.resource === 'roles' && p.action === 'read')
  );

  for (const permission of moderatorPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: moderatorRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: moderatorRole.id,
        permissionId: permission.id,
      },
    });
  }
  console.log('Assigned permissions to moderator role');

  // User gets only read posts permission
  const userPermissions = createdPermissions.filter(
    p => p.resource === 'posts' && p.action === 'read'
  );

  for (const permission of userPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: userRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: userRole.id,
        permissionId: permission.id,
      },
    });
  }
  console.log('Assigned permissions to user role');

  // Create Sample Users
  console.log('\nCreating sample users...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });
  console.log('Created admin user: admin@example.com');

  // Moderator user
  const moderatorUser = await prisma.user.upsert({
    where: { email: 'moderator@example.com' },
    update: {},
    create: {
      email: 'moderator@example.com',
      name: 'Moderator User',
      password: hashedPassword,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: moderatorUser.id,
        roleId: moderatorRole.id,
      },
    },
    update: {},
    create: {
      userId: moderatorUser.id,
      roleId: moderatorRole.id,
    },
  });
  console.log('Created moderator user: moderator@example.com');

  // Regular user
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      name: 'Regular User',
      password: hashedPassword,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: regularUser.id,
        roleId: userRole.id,
      },
    },
    update: {},
    create: {
      userId: regularUser.id,
      roleId: userRole.id,
    },
  });
  console.log('Created regular user: user@example.com');

  console.log('\nSeed completed successfully!');
  console.log('\nTest credentials:');
  console.log('Admin: admin@example.com / password123');
  console.log('Moderator: moderator@example.com / password123');
  console.log('User: user@example.com / password123');
}
