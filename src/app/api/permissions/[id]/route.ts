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
      'permissions',
      'update'
    );
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const { resource, action, description } = body;
    const permission = await RBACService.updatePermission(id, {
      ...(resource && { resource }),
      ...(action && { action }),
      ...(description !== undefined && { description }),
    });
    return NextResponse.json({ permission });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2002') {
      return NextResponse.json(
        { error: 'Permission already exists for this resource:action' },
        { status: 409 }
      );
    }
    if (err.code === 'P2025') {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update permission' },
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
      'permissions',
      'delete'
    );
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id } = await params;
    await RBACService.deletePermission(id);
    return NextResponse.json({ message: 'Permission deleted' });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2025') {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete permission' },
      { status: 500 }
    );
  }
}
