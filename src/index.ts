export type QueryKeyPart = string | number | boolean | object | undefined;
export type QueryKey = readonly QueryKeyPart[];

export type QueryKeyBuilder<
  Args extends unknown[] = [],
  Return extends QueryKey = QueryKey
> = (...args: Args) => Return;

export type QueryKeyRegistry = Record<string, QueryKeyBuilder<any, any>>;

export function createQueryKey<T extends readonly QueryKeyPart[]>(
  ...parts: T
): T {
  return parts;
}

type ValidFunction<T> = T extends (...args: any[]) => readonly QueryKeyPart[]
  ? T
  : never;

type ValidateKeyMap<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? ValidFunction<T[K]>
    : T[K] extends object
    ? ValidateKeyMap<T[K]>
    : never;
};

export class QueryKeyManager {
  private static registry: QueryKeyRegistry = {};
  private static keyNames: Set<string> = new Set();

  static create<
    const KeyMap extends Record<string, QueryKeyBuilder<any, any> | object>
  >(name: string, keyMap: KeyMap & ValidateKeyMap<KeyMap>): KeyMap {
    if (this.keyNames.has(name)) {
      if (process.env.NODE_ENV !== "production") {
        throw new Error(`QueryKeyManager: Key name "${name}" already exists`);
      }
      return keyMap;
    }

    this.keyNames.add(name);

    const register = (prefix: string, node: Record<string, any>) => {
      for (const [key, value] of Object.entries(node)) {
        const fullKey = `${prefix}.${key}`;
        if (typeof value === "function") {
          this.registry[fullKey] = value as QueryKeyBuilder<any, any>;
        } else if (value && typeof value === "object") {
          register(fullKey, value);
        }
      }
    };

    register(name, keyMap);

    return keyMap;
  }

  static getQueryKeys(): Readonly<QueryKeyRegistry> {
    return Object.freeze({ ...this.registry });
  }

  static clearRegistry() {
    this.registry = {};
    this.keyNames.clear();
  }

  private constructor() {}
}

export function migrateLegacyKeys<T extends (...args: any[]) => QueryKey>(
  legacyKey: string,
  newBuilder: T
): T {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`Migrating from legacy key: ${legacyKey}`);
  }
  if (QueryKeyManager.getQueryKeys()[legacyKey]) {
    throw new Error(`Legacy key ${legacyKey} conflicts with new keys`);
  }
  return newBuilder;
}
