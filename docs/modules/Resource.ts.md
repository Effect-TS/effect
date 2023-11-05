---
title: Resource.ts
nav_order: 90
parent: Modules
---

## Resource overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [auto](#auto)
  - [manual](#manual)
- [getters](#getters)
  - [get](#get)
- [models](#models)
  - [Resource (interface)](#resource-interface)
- [symbols](#symbols)
  - [ResourceTypeId](#resourcetypeid)
  - [ResourceTypeId (type alias)](#resourcetypeid-type-alias)
- [utils](#utils)
  - [Resource (namespace)](#resource-namespace)
    - [Variance (interface)](#variance-interface)
  - [refresh](#refresh)

---

# constructors

## auto

Creates a new `Resource` value that is automatically refreshed according to
the specified policy. Note that error retrying is not performed
automatically, so if you want to retry on errors, you should first apply
retry policies to the acquisition effect before passing it to this
constructor.

**Signature**

```ts
export declare const auto: <R, E, A, R2, Out>(
  acquire: Effect.Effect<R, E, A>,
  policy: Schedule.Schedule<R2, unknown, Out>
) => Effect.Effect<Scope.Scope | R | R2, never, Resource<E, A>>
```

Added in v2.0.0

## manual

Creates a new `Resource` value that must be manually refreshed by calling
the refresh method. Note that error retrying is not performed
automatically, so if you want to retry on errors, you should first apply
retry policies to the acquisition effect before passing it to this
constructor.

**Signature**

```ts
export declare const manual: <R, E, A>(
  acquire: Effect.Effect<R, E, A>
) => Effect.Effect<Scope.Scope | R, never, Resource<E, A>>
```

Added in v2.0.0

# getters

## get

Retrieves the current value stored in the cache.

**Signature**

```ts
export declare const get: <E, A>(self: Resource<E, A>) => Effect.Effect<never, E, A>
```

Added in v2.0.0

# models

## Resource (interface)

A `Resource` is a possibly resourceful value that is loaded into memory, and
which can be refreshed either manually or automatically.

**Signature**

```ts
export interface Resource<E, A> extends Resource.Variance<E, A> {
  /** @internal */
  readonly scopedRef: ScopedRef.ScopedRef<Exit.Exit<E, A>>
  /** @internal */
  acquire(): Effect.Effect<Scope.Scope, E, A>
}
```

Added in v2.0.0

# symbols

## ResourceTypeId

**Signature**

```ts
export declare const ResourceTypeId: typeof ResourceTypeId
```

Added in v2.0.0

## ResourceTypeId (type alias)

**Signature**

```ts
export type ResourceTypeId = typeof ResourceTypeId
```

Added in v2.0.0

# utils

## Resource (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<E, A> {
  readonly [ResourceTypeId]: {
    _E: (_: never) => E
    _A: (_: never) => A
  }
}
```

Added in v2.0.0

## refresh

Refreshes the cache. This method will not return until either the refresh
is successful, or the refresh operation fails.

**Signature**

```ts
export declare const refresh: <E, A>(self: Resource<E, A>) => Effect.Effect<never, E, void>
```

Added in v2.0.0
