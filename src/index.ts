export type QueryKeyPart = string | number | boolean | object;
export type QueryKey = QueryKeyPart[];
export type QueryKeyBuilder<Args extends unknown[] = unknown[]> = (
  ...args: Args
) => QueryKey;
export type StoredQueryKeyBuilder = (...args: unknown[]) => QueryKey;
export type QueryKeyRegistry = Record<string, StoredQueryKeyBuilder>;
export type QueryKeyTree = Record<string, unknown>;

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
  static create<KeyMap extends QueryKeyTree>(
    name: string,
    keyMap: KeyMap
  ): KeyMap {
    // Runtime duplicate check
    if (this.keyNames.has(name)) {
      if (process.env.NODE_ENV !== 'production') {
        throw new Error(`QueryKeyManager: Key name "${name}" already exists`);
      }
      return keyMap;
    }

    this.keyNames.add(name);

    // Register each key builder (supports nested maps)
    const register = (prefix: string, node: QueryKeyTree | StoredQueryKeyBuilder) => {
      if (typeof node === 'function') {
        this.registry[prefix] = node as StoredQueryKeyBuilder;
        return;
      }

      for (const [key, value] of Object.entries(node as QueryKeyTree)) {
        const fullKey = `${prefix}.${key}`;
        if (typeof value === 'function') {
          this.registry[fullKey] = value as StoredQueryKeyBuilder;
        } else if (value && typeof value === 'object') {
          register(fullKey, value as QueryKeyTree);
        }
      }
    };

    register(name, keyMap);

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
