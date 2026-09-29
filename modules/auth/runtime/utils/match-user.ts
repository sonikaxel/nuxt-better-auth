export type UserMatch<T> = { [K in keyof T]?: T[K] | T[K][] };

// Fields that are allowed to be comma-separated strings
const COMMA_SEPARATED_FIELDS = new Set(['role']);

/** Match User Object with given object */
export function matchesUser<T extends object>(
  user: T,
  match: UserMatch<T>,
): boolean {
  for (const [key, expected] of Object.entries(match)) {
    const actual = (user as Record<string, unknown>)[key];

    // 1. Normalize expected into an array for unified comparison
    const expectedArray = Array.isArray(expected) ? expected : [expected];

    // 2. Direct match check (e.g., exact equality or array inclusion)
    if (expectedArray.includes(actual as never)) {
      continue;
    }

    // 3. Fallback for comma-separated fields (if applicable)
    if (COMMA_SEPARATED_FIELDS.has(key)) {
      if (checkCommaSeparatedValues(actual, expectedArray)) {
        continue;
      }
    }

    // If all checks fail, the user doesn't match
    return false;
  }

  return true;
}

/** Helper for comma seperated string */
function checkCommaSeparatedValues(
  actual: unknown,
  expectedList: unknown[],
): boolean {
  // Helper to extract clean tokens from a value (handles strings with commas or arrays)
  const extractTokens = (val: unknown): string[] => {
    if (typeof val === 'string') {
      return val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (Array.isArray(val)) {
      return val
        .flatMap((v) =>
          typeof v === 'string' ? v.split(',').map((s) => s.trim()) : [],
        )
        .filter(Boolean);
    }

    return [];
  };

  const actualTokens = extractTokens(actual);
  const expectedTokens = extractTokens(expectedList);

  if (actualTokens.length === 0 || expectedTokens.length === 0) {
    return false;
  }

  // Check if there is any intersection between actual tokens and expected tokens
  return actualTokens.some((token) => expectedTokens.includes(token));
}
