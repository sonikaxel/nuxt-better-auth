import type { RolePermissions } from '#auth';
import { ac, roles as betterAuthRoles } from './access';

// Define Statement extending better-auth statements
export const statement = {
  user: [...ac.statements.user, 'manage'],
  session: [...ac.statements.session, 'manage'],
  project: ['create', 'list', 'delete', 'manage'],
} as const;

// Define Roles extending better-auth roles
export const roles = [
  'user',
  'admin',
] as const satisfies (keyof typeof betterAuthRoles)[];

// Define Permissions, with `manage` wildcard
export const permissions: RolePermissions = {
  // Admins get manage for everything; you can also expand these if needed
  admin: ['manage:user', 'manage:session', 'manage:project'],
  user: ['list:project'],
};
