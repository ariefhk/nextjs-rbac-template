import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.services';
import { RBACService } from '@/services/rbac.services';

export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const hasPermission = await RBACService.hasPermission(
      user.id,
      'permissions',
      'read'
    );
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const permissions = await RBACService.getAllPermissions();
    return NextResponse.json({ permissions });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const hasPermission = await RBACService.hasPermission(
      user.id,
      'permissions',
      'create'
    );
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    const { resource, action, description } = body;
    if (!resource || !action) {
      return NextResponse.json(
        { error: 'resource and action are required' },
        { status: 400 }
      );
    }
    const permission = await RBACService.createPermission(
      resource,
      action,
      description
    );
    return NextResponse.json({ permission }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2002') {
      return NextResponse.json(
        { error: 'Permission already exists for this resource:action' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create permission' },
      { status: 500 }
    );
  }
}
