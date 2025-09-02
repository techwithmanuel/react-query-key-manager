export type QueryKeyPart = string | number | boolean | object | undefined;
export type QueryKey = readonly QueryKeyPart[];

function createQueryKey<const T extends readonly QueryKeyPart[]>(
  ...parts: T
): T {
  return parts;
}

export function defineKey<
  const Parts extends readonly QueryKeyPart[],
  Args extends unknown[] = []
>(fn: (...args: Args) => Parts): (...args: Args) => Parts {
  return ((...args: Args) => {
    const parts = fn(...args);
    return createQueryKey(...parts);
  }) as any;
}

export type QueryKeyBuilder<
  Args extends unknown[] = [],
  Return extends readonly QueryKeyPart[] = readonly QueryKeyPart[]
> = (...args: Args) => Return;

export type QueryKeyRegistry = Record<string, QueryKeyBuilder<any, any>>;

type ValidFunction<T> = T extends (...args: infer A) => infer R
  ? R extends readonly QueryKeyPart[]
    ? T
    : never
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

  static clearRegistry(): void {
    this.registry = {};
    this.keyNames.clear();
  }

  static registerLegacy(
    legacyKey: string,
    builder: QueryKeyBuilder<any, any>
  ): void {
    if (this.registry[legacyKey]) {
      throw new Error(`Legacy key ${legacyKey} conflicts with existing keys`);
    }
    this.registry[legacyKey] = builder;
  }

  private constructor() {}
}

export function migrateLegacyKeys<T extends QueryKeyBuilder<any, any>>(
  legacyKeyOrKeys: string | string[],
  newBuilder: T
): T {
  if (process.env.NODE_ENV !== "production") {
    const list = Array.isArray(legacyKeyOrKeys)
      ? legacyKeyOrKeys.join(", ")
      : legacyKeyOrKeys;
    console.warn(`Migrating legacy key(s): ${list}`);
  }

  const keys = Array.isArray(legacyKeyOrKeys)
    ? legacyKeyOrKeys
    : [legacyKeyOrKeys];

  for (const key of keys) {
    if (QueryKeyManager.getQueryKeys()[key]) {
      throw new Error(`Legacy key ${key} conflicts with new keys`);
    }
    QueryKeyManager.registerLegacy(key, newBuilder);
  }

  return newBuilder;
}
