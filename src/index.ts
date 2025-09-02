export type QueryKeyPart = string | number | boolean | object | undefined;
export type QueryKey = QueryKeyPart[];
export type QueryKeyBuilder<Args extends unknown[] = []> = (
  ...args: Args
) => QueryKey;
export type QueryKeyRegistry = Record<string, QueryKeyBuilder<any>>;

export class QueryKeyManager {
  private static registry: QueryKeyRegistry = {};
  private static keyNames: Set<string> = new Set();

  /**
   * Creates a new query key with collision protection
   *
   * @param name Unique key identifier (dot notation recommended for namespacing)
   * @param keyMap Object containing query key builder functions
   * @returns Type-safe query key builder functions with proper inference
   *
   * @example
   * const userKeys = QueryKeyManager.create('user', {
   *   profile: (userId: string) => ['user', 'profile', userId] as const,
   *   settings: (userId: string, section?: string) => ['user', 'settings', userId, section] as const
   * } as const);
   *
   * // Types are properly inferred:
   * // userKeys.profile: (userId: string) => QueryKey
   * // userKeys.settings: (userId: string, section?: string) => QueryKey
   */
  static create<
    const KeyMap extends Record<string, (...args: any[]) => QueryKey>
  >(name: string, keyMap: KeyMap): KeyMap {
    // Runtime duplicate check
    if (this.keyNames.has(name)) {
      if (process.env.NODE_ENV !== "production") {
        throw new Error(`QueryKeyManager: Key name "${name}" already exists`);
      }
      return keyMap;
    }

    this.keyNames.add(name);

    // Register each key builder (type-erased for storage)
    for (const [key, builder] of Object.entries(keyMap)) {
      const fullKey = `${name}.${key}`;
      this.registry[fullKey] = builder as QueryKeyBuilder<any>;
    }

    return keyMap;
  }

  /**
   * Retrieves all registered query key builders
   *
   * @returns Readonly registry object with all query key builders
   */
  static getQueryKeys(): Readonly<QueryKeyRegistry> {
    return Object.freeze({ ...this.registry });
  }

  /**
   * Clears all registered keys (primarily for testing)
   */
  static clearRegistry() {
    this.registry = {};
    this.keyNames.clear();
  }

  // Private constructor to prevent instantiation
  private constructor() {}
}

export function migrateLegacyKeys<T extends (...args: any[]) => QueryKey>(
  legacyKey: string,
  newBuilder: T
): T {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`Migrating from legacy key: ${legacyKey}`);
  }

  // Runtime check to prevent duplicate registration
  if (QueryKeyManager.getQueryKeys()[legacyKey]) {
    throw new Error(`Legacy key ${legacyKey} conflicts with new keys`);
  }

  return newBuilder;
}
