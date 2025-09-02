![Banner](/public/banner.png)

# React Query Key Manager

A **lightweight**, **type-safe**, and **scalable** way to manage query keys for [`@tanstack/react-query`](https://tanstack.com/query).  
Designed to eliminate query key collisions, improve discoverability, and make key composition effortless.

Install via your preferred package manager:

```sh
# pnpm
pnpm add react-query-key-manager

# yarn
yarn add react-query-key-manager

# npm
npm install react-query-key-manager
```

## 🔑 New `defineKey` Helper (v0.0.113)

A new `defineKey` helper is available to make query key definitions more expressive and type-safe.  
It’s fully **optional** and works alongside existing patterns — you can adopt it gradually.

### Example

```ts
import { QueryKeyManager, defineKey } from "react-query-key-manager";

const userKeys = QueryKeyManager.create("user", {
  profile: defineKey((userId: string) => ["user", "profile", userId]),
  settings: defineKey((userId: string, section?: string) => [
    "user",
    "settings",
    userId,
    section,
  ]),
  list: defineKey(() => ["user", "list"]),
});

// ✅ Strongly typed inference:
const p = userKeys.profile("123");
// type: readonly ["user", "profile", string]
```

## 🎯 Problem Statement

When working on medium-to-large projects with React Query, query keys quickly become a mess:

**Magic strings everywhere** — prone to typos and silent bugs.

**Key collisions** — multiple developers accidentally using the same key for different data.

**Poor discoverability** — no clear place to see all keys at once.

**Inconsistent arguments** — no type safety for parameters passed to keys.

These issues often surface late — during debugging or in production — instead of being caught at compile-time.

## 💡 Core Idea

Use a namespaced key builder that:

1. Centralizes key definitions in a single source of truth.

2. Enforces type safety for key arguments.

3. Prevents duplicates both at compile time and at runtime (in dev).

4. Supports nested namespaces for large-scale projects.

5. Maintains zero runtime cost — types disappear after compilation.

This approach is lightweight enough to copy-paste directly into your project but also available via npm/yarn/pnpm.

## 🛠 Usage Example

`queryKeys.ts`

```tsx
import { QueryKeyManager } from "react-query-key-manager";

export const userKeys = QueryKeyManager.create("user", {
  profile: (userId: string) => ["user", "profile", userId],
  settings: (userId: string) => ["user", "settings", userId],
});

export const postKeys = QueryKeyManager.create("post", {
  list: (filters: { category: string }) => ["posts", filters],
  detail: (postId: string) => ["post", "detail", postId],
});

// Nested namespaces supported
export const adminKeys = QueryKeyManager.create("admin", {
  users: {
    list: (page: number) => ["admin", "users", "list", page],
  },
});

// Debugging — list all registered keys
export const allQueryKeys = QueryKeyManager.getQueryKeys();
```

`UserProfile.tsx`

```tsx
import { useQuery } from "@tanstack/react-query";
import { userKeys } from "./queryKeys";

function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: userKeys.profile(userId),
    queryFn: () => fetchUserProfile(userId),
  });

  // ...
}
```

## 🚀 Advanced Patterns

#### Key Composition

```ts
export const extendedPostKeys = QueryKeyManager.create("post.extended", {
  withAuthor: (postId: string, authorId: string) => [
    ...postKeys.detail(postId)(),
    "author",
    ...userKeys.profile(authorId)(),
  ],
});
```

#### Dependent Keys

```ts
export const dashboardKeys = QueryKeyManager.create("dashboard", {
  summary: (userId: string) => [
    "dashboard",
    "summary",
    ...userKeys.profile(userId)(),
    ...postKeys.list({ category: "featured" })(),
  ],
});
```

## 🔑 Key Features

1. **Duplicate Key Prevention**

- Compile-time: TypeScript errors if you try to redeclare a key name.

- Runtime (dev): Throws if duplicate keys are detected.

2. **Full Type Inference**

- Function arguments are strictly typed.

- Nested namespaces preserve their type signatures.

3. **Performance**

- Zero-cost abstractions — all type checks vanish after compilation.

- Minimal object structure for fast inference.

## 🧭 Migration Utility

For migrating legacy keys safely:

```ts
import { migrateLegacyKeys } from "react-query-key-manager";
import { userKeys } from "./queryKeys";

const legacyUserKey = migrateLegacyKeys("oldUserKey", (userId: string) =>
  userKeys.profile(userId)()
);
```

## 📌 Benefits Recap

- **Zero Runtime Overhead** — Pure TypeScript types.

- **Instant Editor Feedback** — Type errors as you type.

- **Scalable Organization** — Namespaced, nested keys.

- **Collision Protection** — Compile + runtime safety.

- **Discoverability** — getQueryKeys() shows all keys.

## 🪶 Lightweight by Design

You can:

- **Install**: pnpm add react-query-key-manager

- **Or copy-paste** the implementation into your project directly from `src/index.ts`
