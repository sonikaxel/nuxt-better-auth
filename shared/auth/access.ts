import { createAccessControl } from 'better-auth/plugins';
import {
  adminAc,
  defaultStatements,
  userAc,
} from 'better-auth/plugins/admin/access';

const stmt = {
  ...defaultStatements,
} as const;

export const ac = createAccessControl(stmt);

const adminRole = ac.newRole({
  ...adminAc.statements,
});

const userRole = ac.newRole({
  ...userAc.statements,
});

export const roles = {
  admin: adminRole,
  user: userRole,
};
