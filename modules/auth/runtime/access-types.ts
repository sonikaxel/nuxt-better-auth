import { roles, statement } from '~~/shared/auth/permissions';

export type Statement = typeof statement;
export type Role = (typeof roles)[number];

type ActionResourcePair = {
  [P in keyof Statement]: `${Statement[P][number]}:${P}`;
};

export type Permission = ActionResourcePair[keyof ActionResourcePair];

export type RolePermissions = {
  [P in Role]: Permission[];
};
