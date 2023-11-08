---
title: Pool.ts
nav_order: 77
parent: Modules
---

## Pool overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [combinators](#combinators)
  - [invalidate](#invalidate)
- [constructors](#constructors)
  - [make](#make)
  - [makeWithTTL](#makewithttl)
- [getters](#getters)
  - [get](#get)
- [models](#models)
  - [Pool (interface)](#pool-interface)
- [refinements](#refinements)
  - [isPool](#ispool)
- [symbols](#symbols)
  - [PoolTypeId](#pooltypeid)
  - [PoolTypeId (type alias)](#pooltypeid-type-alias)
- [utils](#utils)
  - [Pool (namespace)](#pool-namespace)
    - [Variance (interface)](#variance-interface)

---

# combinators

## invalidate

Invalidates the specified item. This will cause the pool to eventually
reallocate the item, although this reallocation may occur lazily rather
than eagerly.

**Signature**

```ts
export declare const invalidate: {
  <A>(value: A): <E>(self: Pool<E, A>) => Effect<Scope, never, void>
  <E, A>(self: Pool<E, A>, value: A): Effect<Scope, never, void>
}
```

Added in v2.0.0

# constructors

## make

Makes a new pool of the specified fixed size. The pool is returned in a
`Scope`, which governs the lifetime of the pool. When the pool is shutdown
because the `Scope` is closed, the individual items allocated by the pool
will be released in some unspecified order.

**Signature**

```ts
export declare const make: <R, E, A>(options: {
  readonly acquire: Effect<R, E, A>
  readonly size: number
}) => Effect<Scope | R, never, Pool<E, A>>
```

Added in v2.0.0

## makeWithTTL

Makes a new pool with the specified minimum and maximum sizes and time to
live before a pool whose excess items are not being used will be shrunk
down to the minimum size. The pool is returned in a `Scope`, which governs
the lifetime of the pool. When the pool is shutdown because the `Scope` is
used, the individual items allocated by the pool will be released in some
unspecified order.

```ts
import { Duration } from "./Duration"
import { Effect } from "effect/Effect"
import { Pool } from "effect/Pool"
import { Scope } from "effect/Scope"
import { pipe } from "./Function"

Effect.scoped(
  pipe(
    Pool.make(acquireDbConnection, 10, 20, Duration.seconds(60)),
    Effect.flatMap((pool) =>
      Effect.scoped(
        pipe(
          pool.get(),
          Effect.flatMap((connection) => useConnection(connection))
        )
      )
    )
  )
)
```

**Signature**

```ts
export declare const makeWithTTL: <R, E, A>(options: {
  readonly acquire: Effect<R, E, A>
  readonly min: number
  readonly max: number
  readonly timeToLive: Duration.DurationInput
}) => Effect<Scope | R, never, Pool<E, A>>
```

Added in v2.0.0

# getters

## get

Retrieves an item from the pool in a scoped effect. Note that if
acquisition fails, then the returned effect will fail for that same reason.
Retrying a failed acquisition attempt will repeat the acquisition attempt.

**Signature**

```ts
export declare const get: <E, A>(self: Pool<E, A>) => Effect<Scope, E, A>
```

Added in v2.0.0

# models

## Pool (interface)

A `Pool<E, A>` is a pool of items of type `A`, each of which may be
associated with the acquisition and release of resources. An attempt to get
an item `A` from a pool may fail with an error of type `E`.

**Signature**

```ts
export interface Pool<E, A> extends Data.Case, Pool.Variance<E, A>, Pipeable {
  /**
   * Retrieves an item from the pool in a scoped effect. Note that if
   * acquisition fails, then the returned effect will fail for that same reason.
   * Retrying a failed acquisition attempt will repeat the acquisition attempt.
   */
  get(): Effect<Scope, E, A>

  /**
   * Invalidates the specified item. This will cause the pool to eventually
   * reallocate the item, although this reallocation may occur lazily rather
   * than eagerly.
   */
  invalidate(item: A): Effect<never, never, void>
}
```

Added in v2.0.0

# refinements

## isPool

Returns `true` if the specified value is a `Pool`, `false` otherwise.

**Signature**

```ts
export declare const isPool: (u: unknown) => u is Pool<unknown, unknown>
```

Added in v2.0.0

# symbols

## PoolTypeId

**Signature**

```ts
export declare const PoolTypeId: typeof PoolTypeId
```

Added in v2.0.0

## PoolTypeId (type alias)

**Signature**

```ts
export type PoolTypeId = typeof PoolTypeId
```

Added in v2.0.0

# utils

## Pool (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<E, A> {
  readonly [PoolTypeId]: {
    readonly _E: (_: never) => E
    readonly _A: (_: never) => A
  }
}
```

Added in v2.0.0
