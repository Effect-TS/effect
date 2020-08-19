---
title: Prelude/HKT/instance.ts
nav_order: 31
parent: Modules
---

## instance overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Ignores (type alias)](#ignores-type-alias)
  - [instance](#instance)

---

# utils

## Ignores (type alias)

**Signature**

```ts
export type Ignores = 'F' | 'G' | 'CommutativeBoth' | 'CommutativeEither'
```

Added in v1.0.0

## instance

**Signature**

```ts
export declare const instance: <T>(_: Pick<T, Exclude<keyof T, Ignores>>) => T
```

Added in v1.0.0
