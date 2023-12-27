/**
 * @since 2.0.0
 */
import type * as Duration from "./Duration.js"
import type * as Effect from "./Effect.js"
import * as internal from "./internal/keyedPool.js"
import type { Pipeable } from "./Pipeable.js"
import type * as Scope from "./Scope.js"
import type * as Types from "./Types.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const KeyedPoolTypeId: unique symbol = internal.KeyedPoolTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type KeyedPoolTypeId = typeof KeyedPoolTypeId

/**
 * A `KeyedPool<K, E, A>` is a pool of `Pool`s of items of type `A`. Each pool
 * in the `KeyedPool` is associated with a key of type `K`.
 *
 * @since 2.0.0
 * @category models
 */
export interface KeyedPool<in K, out E, in out A> extends KeyedPool.Variance<K, E, A>, Pipeable {
  /**
   * Retrieves an item from the pool belonging to the given key in a scoped
   * effect. Note that if acquisition fails, then the returned effect will fail
   * for that same reason. Retrying a failed acquisition attempt will repeat the
   * acquisition attempt.
   */
  get(key: K): Effect.Effect<Scope.Scope, E, A>

  /**
   * Invalidates the specified item. This will cause the pool to eventually
   * reallocate the item, although this reallocation may occur lazily rather
   * than eagerly.
   */
  invalidate(item: A): Effect.Effect<never, never, void>
}

/**
 * @since 2.0.0
 */
export declare namespace KeyedPool {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<in K, out E, in out A> {
    readonly [KeyedPoolTypeId]: {
      readonly _K: Types.Contravariant<K>
      readonly _E: Types.Covariant<E>
      readonly _A: Types.Invariant<A>
    }
  }
}

/**
 * Makes a new pool of the specified fixed size. The pool is returned in a
 * `Scope`, which governs the lifetime of the pool. When the pool is shutdown
 * because the `Scope` is closed, the individual items allocated by the pool
 * will be released in some unspecified order.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <K, R, E, A>(
  options: {
    readonly acquire: (key: K) => Effect.Effect<R, E, A>
    readonly size: number
  }
) => Effect.Effect<Scope.Scope | R, never, KeyedPool<K, E, A>> = internal.make

/**
 * Makes a new pool of the specified fixed size. The pool is returned in a
 * `Scope`, which governs the lifetime of the pool. When the pool is shutdown
 * because the `Scope` is closed, the individual items allocated by the pool
 * will be released in some unspecified order.
 *
 * The size of the underlying pools can be configured per key.
 *
 * @since 2.0.0
 * @category constructors
 */
export const makeWith: <K, R, E, A>(
  options: {
    readonly acquire: (key: K) => Effect.Effect<R, E, A>
    readonly size: (key: K) => number
  }
) => Effect.Effect<Scope.Scope | R, never, KeyedPool<K, E, A>> = internal.makeWith

/**
 * Makes a new pool with the specified minimum and maximum sizes and time to
 * live before a pool whose excess items are not being used will be shrunk
 * down to the minimum size. The pool is returned in a `Scope`, which governs
 * the lifetime of the pool. When the pool is shutdown because the `Scope` is
 * used, the individual items allocated by the pool will be released in some
 * unspecified order.
 *
 * The size of the underlying pools can be configured per key.
 *
 * @since 2.0.0
 * @category constructors
 */
export const makeWithTTL: <K, R, E, A>(
  options: {
    readonly acquire: (key: K) => Effect.Effect<R, E, A>
    readonly min: (key: K) => number
    readonly max: (key: K) => number
    readonly timeToLive: Duration.DurationInput
  }
) => Effect.Effect<Scope.Scope | R, never, KeyedPool<K, E, A>> = internal.makeWithTTL

/**
 * Makes a new pool with the specified minimum and maximum sizes and time to
 * live before a pool whose excess items are not being used will be shrunk
 * down to the minimum size. The pool is returned in a `Scope`, which governs
 * the lifetime of the pool. When the pool is shutdown because the `Scope` is
 * used, the individual items allocated by the pool will be released in some
 * unspecified order.
 *
 * The size of the underlying pools can be configured per key.
 *
 * @since 2.0.0
 * @category constructors
 */
export const makeWithTTLBy: <K, R, E, A>(
  options: {
    readonly acquire: (key: K) => Effect.Effect<R, E, A>
    readonly min: (key: K) => number
    readonly max: (key: K) => number
    readonly timeToLive: (key: K) => Duration.DurationInput
  }
) => Effect.Effect<Scope.Scope | R, never, KeyedPool<K, E, A>> = internal.makeWithTTLBy

/**
 * Retrieves an item from the pool belonging to the given key in a scoped
 * effect. Note that if acquisition fails, then the returned effect will fail
 * for that same reason. Retrying a failed acquisition attempt will repeat the
 * acquisition attempt.
 *
 * @since 2.0.0
 * @category combinators
 */
export const get: {
  <K>(key: K): <E, A>(self: KeyedPool<K, E, A>) => Effect.Effect<Scope.Scope, E, A>
  <K, E, A>(self: KeyedPool<K, E, A>, key: K): Effect.Effect<Scope.Scope, E, A>
} = internal.get

/**
 * Invalidates the specified item. This will cause the pool to eventually
 * reallocate the item, although this reallocation may occur lazily rather
 * than eagerly.
 *
 * @since 2.0.0
 * @category combinators
 */
export const invalidate: {
  <A>(item: A): <K, E>(self: KeyedPool<K, E, A>) => Effect.Effect<never, never, void>
  <K, E, A>(self: KeyedPool<K, E, A>, item: A): Effect.Effect<never, never, void>
} = internal.invalidate
