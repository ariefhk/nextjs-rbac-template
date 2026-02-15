import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.services';
import { RBACService } from '@/services/rbac.services';

export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const permissions = RBACService.extractPermissions(user);
    const roles = user.roles.map(ur => ur.role.name);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        roles,
        permissions,
      },
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
