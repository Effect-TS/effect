---
title: MergeDecision.ts
nav_order: 53
parent: Modules
---

## MergeDecision overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [Await](#await)
  - [AwaitConst](#awaitconst)
  - [Done](#done)
- [folding](#folding)
  - [match](#match)
- [models](#models)
  - [MergeDecision (interface)](#mergedecision-interface)
- [refinements](#refinements)
  - [isMergeDecision](#ismergedecision)
- [symbols](#symbols)
  - [MergeDecisionTypeId](#mergedecisiontypeid)
  - [MergeDecisionTypeId (type alias)](#mergedecisiontypeid-type-alias)
- [utils](#utils)
  - [MergeDecision (namespace)](#mergedecision-namespace)
    - [Variance (interface)](#variance-interface)

---

# constructors

## Await

**Signature**

```ts
export declare const Await: <R, E0, Z0, E, Z>(
  f: (exit: Exit.Exit<E0, Z0>) => Effect.Effect<R, E, Z>
) => MergeDecision<R, E0, Z0, E, Z>
```

Added in v2.0.0

## AwaitConst

**Signature**

```ts
export declare const AwaitConst: <R, E, Z>(effect: Effect.Effect<R, E, Z>) => MergeDecision<R, unknown, unknown, E, Z>
```

Added in v2.0.0

## Done

**Signature**

```ts
export declare const Done: <R, E, Z>(effect: Effect.Effect<R, E, Z>) => MergeDecision<R, unknown, unknown, E, Z>
```

Added in v2.0.0

# folding

## match

**Signature**

```ts
export declare const match: {
  <R, E0, Z0, E, Z, Z2>(options: {
    readonly onDone: (effect: Effect.Effect<R, E, Z>) => Z2
    readonly onAwait: (f: (exit: Exit.Exit<E0, Z0>) => Effect.Effect<R, E, Z>) => Z2
  }): (self: MergeDecision<R, E0, Z0, E, Z>) => Z2
  <R, E0, Z0, E, Z, Z2>(
    self: MergeDecision<R, E0, Z0, E, Z>,
    options: {
      readonly onDone: (effect: Effect.Effect<R, E, Z>) => Z2
      readonly onAwait: (f: (exit: Exit.Exit<E0, Z0>) => Effect.Effect<R, E, Z>) => Z2
    }
  ): Z2
}
```

Added in v2.0.0

# models

## MergeDecision (interface)

**Signature**

```ts
export interface MergeDecision<out R, in E0, in Z0, out E, out Z> extends MergeDecision.Variance<R, E0, Z0, E, Z> {}
```

Added in v2.0.0

# refinements

## isMergeDecision

Returns `true` if the specified value is a `MergeDecision`, `false`
otherwise.

**Signature**

```ts
export declare const isMergeDecision: (u: unknown) => u is MergeDecision<unknown, unknown, unknown, unknown, unknown>
```

Added in v2.0.0

# symbols

## MergeDecisionTypeId

**Signature**

```ts
export declare const MergeDecisionTypeId: typeof MergeDecisionTypeId
```

Added in v2.0.0

## MergeDecisionTypeId (type alias)

**Signature**

```ts
export type MergeDecisionTypeId = typeof MergeDecisionTypeId
```

Added in v2.0.0

# utils

## MergeDecision (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<out R, in E0, in Z0, out E, out Z> {
  readonly [MergeDecisionTypeId]: {
    _R: Types.Covariant<R>
    _E0: Types.Contravariant<E0>
    _Z0: Types.Contravariant<Z0>
    _E: Types.Covariant<E>
    _Z: Types.Covariant<Z>
  }
}
```

Added in v2.0.0
