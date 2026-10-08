import { permissions, roles } from '~~/shared/auth/permissions';
import type { Permission, Role, Statement } from '../access-types';
import type { ClientAuthUser } from '../types';

// Type guard to check if a string is a valid Role
function isRole(value: string): value is Role {
  return (roles as readonly string[]).includes(value);
}

export function can(
  /** Current logged-in user */
  user: ClientAuthUser | undefined | null,
  /** Permission to check */
  requiredPermissions: Permission[],
  /** Match all permission, default false */
  matchAll: boolean = false, // Option to require ALL or ANY
): boolean {
  if (!user?.role) return false;

  const userRoles = user.role
    .split(',')
    .map((r) => r.trim())
    .filter(isRole);

  const rolePermission = new Set(
    userRoles.flatMap((role) => permissions[role]),
  );

  // Helper to check if user has a specific permission
  // (supporting 'manage' wildcard)
  const checkPerm = (perm: Permission): boolean => {
    if (rolePermission.has(perm)) return true;

    // Check for resource-level 'manage' wildcard
    // (e.g., 'manage:project' covers 'create:project')
    const [action, resource] = perm.split(':') as [string, keyof Statement];
    const managePerm = `manage:${resource}` as Permission;
    return rolePermission.has(managePerm);
  };

  return matchAll
    ? requiredPermissions.every(checkPerm)
    : requiredPermissions.some(checkPerm);
}
