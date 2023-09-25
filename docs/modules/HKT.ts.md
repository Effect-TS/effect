---
title: HKT.ts
nav_order: 39
parent: Modules
---

## HKT overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Kind (type alias)](#kind-type-alias)
  - [TypeClass (interface)](#typeclass-interface)
  - [TypeLambda (interface)](#typelambda-interface)

---

# utils

## Kind (type alias)

**Signature**

```ts
export type Kind<F extends TypeLambda, In, Out2, Out1, Target> = F extends {
  readonly type: unknown
}
  ? (F & {
      readonly In: In
      readonly Out2: Out2
      readonly Out1: Out1
      readonly Target: Target
    })['type']
  : {
      readonly F: F
      readonly In: (_: In) => void
      readonly Out2: () => Out2
      readonly Out1: () => Out1
      readonly Target: (_: Target) => Target
    }
```

Added in v1.0.0

## TypeClass (interface)

**Signature**

```ts
export interface TypeClass<F extends TypeLambda> {
  readonly [URI]?: F
}
```

Added in v1.0.0

## TypeLambda (interface)

**Signature**

```ts
export interface TypeLambda {
  readonly In: unknown
  readonly Out2: unknown
  readonly Out1: unknown
  readonly Target: unknown
}
```

Added in v1.0.0
