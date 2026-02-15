import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.services';
import { RBACService } from '@/services/rbac.services';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await AuthService.getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const hasPermission = await RBACService.hasPermission(
      user.id,
      'roles',
      'update'
    );
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id: roleId } = await params;
    const body = await request.json();
    const { permissionId } = body;
    if (!permissionId) {
      return NextResponse.json(
        { error: 'permissionId is required' },
        { status: 400 }
      );
    }
    await RBACService.assignPermissionToRole(roleId, permissionId);
    return NextResponse.json(
      { message: 'Permission assigned to role' },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2002') {
      return NextResponse.json(
        { error: 'Role already has this permission' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to assign permission' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await AuthService.getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const hasPermission = await RBACService.hasPermission(
      user.id,
      'roles',
      'update'
    );
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id: roleId } = await params;
    const { searchParams } = new URL(request.url);
    const permissionId = searchParams.get('permissionId');
    if (!permissionId) {
      return NextResponse.json(
        { error: 'permissionId query is required' },
        { status: 400 }
      );
    }
    await RBACService.removePermissionFromRole(roleId, permissionId);
    return NextResponse.json(
      { message: 'Permission removed from role' },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Failed to remove permission from role' },
      { status: 500 }
    );
  }
}
