export function buildRouteRuleTypeTemplate({
  resolve,
  serverAuthPath,
}: {
  resolve: (...path: string[]) => string;
  serverAuthPath: string;
}) {
  return [
    `import { UserMatch } from '${resolve('./runtime/utils/match-user')}';`,
    `import type { AuthMode } from '${resolve('./runtime/types')}';`,
    `import authServerConfig from '${serverAuthPath}'`,
    `import type { Auth } from 'better-auth';`,
    ``,
    `type AuthUser = Auth<typeof authServerConfig>['$Infer']['Session']['user'];`,
    `type User = Omit<AuthUser, 'createdAt' | 'updatedAt' | 'banExpires'>;`,
    `export type MatchAuthUser = UserMatch<User>;`,
    ``,
    `type AuthMeta =`,
    `  | false`,
    `  | AuthMode`,
    `  | {`,
    `      only?: AuthMode;`,
    `      user?: MatchAuthUser;`,
    `      redirectTo?: string;`,
    `    };`,
    ``,
    `type AuthRouteRules = Record<string, unknown> & { auth?: AuthMeta };`,
    ``,
    `declare module 'nitropack/types' {`,
    `  interface NitroRouteConfig extends AuthRouteRules {}`,
    `  interface NitroRouteRules extends AuthRouteRules {}`,
    `}`,
  ].join('\n');
}
