export type QueryKeyPart = string | number | boolean | object;
export type QueryKey = QueryKeyPart[];
export type QueryKeyBuilder<Args extends any[] = []> = (
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
   * @param builder Function that constructs the query key
   * @returns Type-safe query key builder function
   *
   * @example
   * const userKeys = QueryKeyManager.create('user', {
   *   profile: (userId: string) => ['user', 'profile', userId],
   *   settings: (userId: string) => ['user', 'settings', userId]
   * });
   */
  static create<KeyMap extends Record<string, QueryKeyBuilder>>(
    name: string,
    keyMap: KeyMap
  ): KeyMap {
    // Runtime duplicate check
    if (this.keyNames.has(name)) {
      if (process.env.NODE_ENV !== "production") {
        throw new Error(`QueryKeyManager: Key name "${name}" already exists`);
      }
      return keyMap;
    }

    this.keyNames.add(name);

    // Register each key builder
    for (const [key, builder] of Object.entries(keyMap)) {
      const fullKey = `${name}.${key}`;
      this.registry[fullKey] = builder;
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

export function migrateLegacyKeys<T extends QueryKeyBuilder>(
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
