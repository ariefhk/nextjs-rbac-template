/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.services';
import { RBACService } from '@/services/rbac.services';

// Assign role to user
export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to assign roles
    const hasPermission = await RBACService.hasPermission(
      user.id,
      'users',
      'assign_role'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, roleId } = body;

    if (!userId || !roleId) {
      return NextResponse.json(
        { error: 'userId and roleId are required' },
        { status: 400 }
      );
    }

    await RBACService.assignRole(userId, roleId, user.id);

    return NextResponse.json(
      { message: 'Role assigned successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'User already has this role' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to assign role' },
      { status: 500 }
    );
  }
}

// Remove role from user
export async function DELETE(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to remove roles
    const hasPermission = await RBACService.hasPermission(
      user.id,
      'users',
      'remove_role'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, roleId } = body;

    if (!userId || !roleId) {
      return NextResponse.json(
        { error: 'userId and roleId are required' },
        { status: 400 }
      );
    }

    await RBACService.removeRole(userId, roleId);

    return NextResponse.json(
      { message: 'Role removed successfully' },
      { status: 200 }
    );
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to remove role' },
      { status: 500 }
    );
  }
}
