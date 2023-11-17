---
title: Cache.ts
nav_order: 5
parent: Modules
---

## Cache overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
  - [makeCacheStats](#makecachestats)
  - [makeEntryStats](#makeentrystats)
  - [makeWith](#makewith)
- [models](#models)
  - [Cache (interface)](#cache-interface)
  - [CacheStats (interface)](#cachestats-interface)
  - [ConsumerCache (interface)](#consumercache-interface)
  - [EntryStats (interface)](#entrystats-interface)
  - [Lookup (type alias)](#lookup-type-alias)
- [symbols](#symbols)
  - [CacheTypeId](#cachetypeid)
  - [CacheTypeId (type alias)](#cachetypeid-type-alias)
- [utils](#utils)
  - [Cache (namespace)](#cache-namespace)
    - [Variance (interface)](#variance-interface)

---

# constructors

## make

Constructs a new cache with the specified capacity, time to live, and
lookup function.

**Signature**

```ts
export declare const make: <Key, Environment, Error, Value>(options: {
  readonly capacity: number
  readonly timeToLive: Duration.DurationInput
  readonly lookup: Lookup<Key, Environment, Error, Value>
}) => Effect.Effect<Environment, never, Cache<Key, Error, Value>>
```

Added in v2.0.0

## makeCacheStats

Constructs a new `CacheStats` from the specified values.

**Signature**

```ts
export declare const makeCacheStats: (options: {
  readonly hits: number
  readonly misses: number
  readonly size: number
}) => CacheStats
```

Added in v2.0.0

## makeEntryStats

Constructs a new `EntryStats` from the specified values.

**Signature**

```ts
export declare const makeEntryStats: (loadedMillis: number) => EntryStats
```

Added in v2.0.0

## makeWith

Constructs a new cache with the specified capacity, time to live, and
lookup function, where the time to live can depend on the `Exit` value
returned by the lookup function.

**Signature**

```ts
export declare const makeWith: <Key, Environment, Error, Value>(options: {
  readonly capacity: number
  readonly lookup: Lookup<Key, Environment, Error, Value>
  readonly timeToLive: (exit: Exit.Exit<Error, Value>) => Duration.DurationInput
}) => Effect.Effect<Environment, never, Cache<Key, Error, Value>>
```

Added in v2.0.0

# models

## Cache (interface)

A `Cache` is defined in terms of a lookup function that, given a key of
type `Key`, can either fail with an error of type `Error` or succeed with a
value of type `Value`. Getting a value from the cache will either return
the previous result of the lookup function if it is available or else
compute a new result with the lookup function, put it in the cache, and
return it.

A cache also has a specified capacity and time to live. When the cache is
at capacity the least recently accessed values in the cache will be
removed to make room for new values. Getting a value with a life older than
the specified time to live will result in a new value being computed with
the lookup function and returned when available.

The cache is safe for concurrent access. If multiple fibers attempt to get
the same key the lookup function will only be computed once and the result
will be returned to all fibers.

**Signature**

```ts
export interface Cache<in out Key, out Error, out Value> extends ConsumerCache<Key, Error, Value> {
  /**
   * Retrieves the value associated with the specified key if it exists.
   * Otherwise computes the value with the lookup function, puts it in the
   * cache, and returns it.
   */
  get(key: Key): Effect.Effect<never, Error, Value>

  /**
   * Retrieves the value associated with the specified key if it exists as a left.
   * Otherwise computes the value with the lookup function, puts it in the
   * cache, and returns it as a right.
   */
  getEither(key: Key): Effect.Effect<never, Error, Either<Value, Value>>

  /**
   * Computes the value associated with the specified key, with the lookup
   * function, and puts it in the cache. The difference between this and
   * `get` method is that `refresh` triggers (re)computation of the value
   * without invalidating it in the cache, so any request to the associated
   * key can still be served while the value is being re-computed/retrieved
   * by the lookup function. Additionally, `refresh` always triggers the
   * lookup function, disregarding the last `Error`.
   */
  refresh(key: Key): Effect.Effect<never, Error, void>

  /**
   * Associates the specified value with the specified key in the cache.
   */
  set(key: Key, value: Value): Effect.Effect<never, never, void>
}
```

Added in v2.0.0

## CacheStats (interface)

`CacheStats` represents a snapshot of statistics for the cache as of a
point in time.

**Signature**

```ts
export interface CacheStats {
  readonly hits: number
  readonly misses: number
  readonly size: number
}
```

Added in v2.0.0

## ConsumerCache (interface)

A ConsumerCache models a portion of a cache which is safe to share without allowing to create new values or access existing ones.

It can be used safely to give over control for request management without leaking writer side details.

**Signature**

```ts
export interface ConsumerCache<in out Key, out Error, out Value> extends Cache.Variance<Key, Error, Value> {
  /**
   * Retrieves the value associated with the specified key if it exists.
   * Otherwise returns `Option.none`.
   */
  getOption(key: Key): Effect.Effect<never, Error, Option.Option<Value>>

  /**
   * Retrieves the value associated with the specified key if it exists and the
   * lookup function has completed. Otherwise returns `Option.none`.
   */
  getOptionComplete(key: Key): Effect.Effect<never, never, Option.Option<Value>>

  /**
   * Returns statistics for this cache.
   */
  readonly cacheStats: Effect.Effect<never, never, CacheStats>

  /**
   * Returns whether a value associated with the specified key exists in the
   * cache.
   */
  contains(key: Key): Effect.Effect<never, never, boolean>

  /**
   * Returns statistics for the specified entry.
   */
  entryStats(key: Key): Effect.Effect<never, never, Option.Option<EntryStats>>

  /**
   * Invalidates the value associated with the specified key.
   */
  invalidate(key: Key): Effect.Effect<never, never, void>

  /**
   * Invalidates the value associated with the specified key if the predicate holds.
   */
  invalidateWhen(key: Key, predicate: Predicate.Predicate<Value>): Effect.Effect<never, never, void>

  /**
   * Invalidates all values in the cache.
   */
  readonly invalidateAll: Effect.Effect<never, never, void>

  /**
   * Returns the approximate number of values in the cache.
   */
  readonly size: Effect.Effect<never, never, number>

  /**
   * Returns an approximation of the values in the cache.
   */
  readonly keys: Effect.Effect<never, never, Array<Key>>

  /**
   * Returns an approximation of the values in the cache.
   */
  readonly values: Effect.Effect<never, never, Array<Value>>

  /**
   * Returns an approximation of the values in the cache.
   */
  readonly entries: Effect.Effect<never, never, Array<[Key, Value]>>
}
```

Added in v2.0.0

## EntryStats (interface)

Represents a snapshot of statistics for an entry in the cache.

**Signature**

```ts
export interface EntryStats {
  readonly loadedMillis: number
}
```

Added in v2.0.0

## Lookup (type alias)

A `Lookup` represents a lookup function that, given a key of type `Key`, can
return an effect that will either produce a value of type `Value` or fail
with an error of type `Error` using an environment of type `Environment`.

**Signature**

```ts
export type Lookup<Key, Environment, Error, Value> = (key: Key) => Effect.Effect<Environment, Error, Value>
```

Added in v2.0.0

# symbols

## CacheTypeId

**Signature**

```ts
export declare const CacheTypeId: typeof CacheTypeId
```

Added in v2.0.0

## CacheTypeId (type alias)

**Signature**

```ts
export type CacheTypeId = typeof CacheTypeId
```

Added in v2.0.0

# utils

## Cache (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<in out Key, out Error, out Value> {
  readonly [CacheTypeId]: {
    readonly _Key: (_: Key) => Key
    readonly _Error: (_: never) => Error
    readonly _Value: (_: never) => Value
  }
}
```

Added in v2.0.0
