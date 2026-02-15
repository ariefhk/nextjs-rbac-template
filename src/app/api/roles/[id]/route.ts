import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.services';
import { RBACService } from '@/services/rbac.services';

export async function PATCH(
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
    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;
    const role = await RBACService.updateRole(id, {
      ...(name && { name }),
      ...(description !== undefined && { description }),
    });
    return NextResponse.json({ role });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2002') {
      return NextResponse.json(
        { error: 'Role name already exists' },
        { status: 409 }
      );
    }
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await AuthService.getCurrentUser(_request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const hasPermission = await RBACService.hasPermission(
      user.id,
      'roles',
      'delete'
    );
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id } = await params;
    await RBACService.deleteRole(id);
    return NextResponse.json({ message: 'Role deleted' });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to delete role' },
      { status: 500 }
    );
  }
}
