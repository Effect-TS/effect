---
title: GroupBy.ts
nav_order: 39
parent: Modules
---

## GroupBy overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
- [destructors](#destructors)
  - [evaluate](#evaluate)
- [models](#models)
  - [GroupBy (interface)](#groupby-interface)
- [symbols](#symbols)
  - [GroupByTypeId](#groupbytypeid)
  - [GroupByTypeId (type alias)](#groupbytypeid-type-alias)
- [utils](#utils)
  - [GroupBy (namespace)](#groupby-namespace)
    - [Variance (interface)](#variance-interface)
  - [filter](#filter)
  - [first](#first)

---

# constructors

## make

Constructs a `GroupBy` from a `Stream`.

**Signature**

```ts
export declare const make: <R, E, K, V>(
  grouped: Stream.Stream<R, E, readonly [K, Queue.Dequeue<Take.Take<E, V>>]>
) => GroupBy<R, E, K, V>
```

Added in v2.0.0

# destructors

## evaluate

Run the function across all groups, collecting the results in an
arbitrary order.

**Signature**

```ts
export declare const evaluate: {
  <K, E, V, R2, E2, A>(
    f: (key: K, stream: Stream.Stream<never, E, V>) => Stream.Stream<R2, E2, A>,
    options?: { readonly bufferSize?: number | undefined }
  ): <R>(self: GroupBy<R, E, K, V>) => Stream.Stream<R2 | R, E | E2, A>
  <R, K, E, V, R2, E2, A>(
    self: GroupBy<R, E, K, V>,
    f: (key: K, stream: Stream.Stream<never, E, V>) => Stream.Stream<R2, E2, A>,
    options?: { readonly bufferSize?: number | undefined }
  ): Stream.Stream<R | R2, E | E2, A>
}
```

Added in v2.0.0

# models

## GroupBy (interface)

Representation of a grouped stream. This allows to filter which groups will
be processed. Once this is applied all groups will be processed in parallel
and the results will be merged in arbitrary order.

**Signature**

```ts
export interface GroupBy<out R, out E, out K, out V> extends GroupBy.Variance<R, E, K, V>, Pipeable {
  readonly grouped: Stream.Stream<R, E, readonly [K, Queue.Dequeue<Take.Take<E, V>>]>
}
```

Added in v2.0.0

# symbols

## GroupByTypeId

**Signature**

```ts
export declare const GroupByTypeId: typeof GroupByTypeId
```

Added in v2.0.0

## GroupByTypeId (type alias)

**Signature**

```ts
export type GroupByTypeId = typeof GroupByTypeId
```

Added in v2.0.0

# utils

## GroupBy (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<out R, out E, out K, out V> {
  readonly [GroupByTypeId]: {
    readonly _R: Types.Covariant<R>
    readonly _E: Types.Covariant<E>
    readonly _K: Types.Covariant<K>
    readonly _V: Types.Covariant<V>
  }
}
```

Added in v2.0.0

## filter

Filter the groups to be processed.

**Signature**

```ts
export declare const filter: {
  <K>(predicate: Predicate<K>): <R, E, V>(self: GroupBy<R, E, K, V>) => GroupBy<R, E, K, V>
  <R, E, V, K>(self: GroupBy<R, E, K, V>, predicate: Predicate<K>): GroupBy<R, E, K, V>
}
```

Added in v2.0.0

## first

Only consider the first `n` groups found in the `Stream`.

**Signature**

```ts
export declare const first: {
  (n: number): <R, E, K, V>(self: GroupBy<R, E, K, V>) => GroupBy<R, E, K, V>
  <R, E, K, V>(self: GroupBy<R, E, K, V>, n: number): GroupBy<R, E, K, V>
}
```

Added in v2.0.0
