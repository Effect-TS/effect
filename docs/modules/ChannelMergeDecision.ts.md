---
title: ChannelMergeDecision.ts
nav_order: 8
parent: Modules
---

## ChannelMergeDecision overview

Added in v1.0.0

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

Added in v1.0.0

## AwaitConst

**Signature**

```ts
export declare const AwaitConst: <R, E, Z>(effect: Effect.Effect<R, E, Z>) => MergeDecision<R, unknown, unknown, E, Z>
```

Added in v1.0.0

## Done

**Signature**

```ts
export declare const Done: <R, E, Z>(effect: Effect.Effect<R, E, Z>) => MergeDecision<R, unknown, unknown, E, Z>
```

Added in v1.0.0

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

Added in v1.0.0

# models

## MergeDecision (interface)

**Signature**

```ts
export interface MergeDecision<R, E0, Z0, E, Z> extends MergeDecision.Variance<R, E0, Z0, E, Z> {}
```

Added in v1.0.0

# refinements

## isMergeDecision

Returns `true` if the specified value is a `MergeDecision`, `false`
otherwise.

**Signature**

```ts
export declare const isMergeDecision: (u: unknown) => u is MergeDecision<unknown, unknown, unknown, unknown, unknown>
```

Added in v1.0.0

# symbols

## MergeDecisionTypeId

**Signature**

```ts
export declare const MergeDecisionTypeId: typeof MergeDecisionTypeId
```

Added in v1.0.0

## MergeDecisionTypeId (type alias)

**Signature**

```ts
export type MergeDecisionTypeId = typeof MergeDecisionTypeId
```

Added in v1.0.0

# utils

## MergeDecision (namespace)

Added in v1.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<R, E0, Z0, E, Z> {
  readonly [MergeDecisionTypeId]: {
    _R: (_: never) => R
    _E0: (_: E0) => void
    _Z0: (_: Z0) => void
    _E: (_: never) => E
    _Z: (_: never) => Z
  }
}
```

Added in v1.0.0
