/**
 * @since 3.5.0
 */
import type * as Cause from "./Cause.js"
import type * as Duration from "./Duration.js"
import type * as Effect from "./Effect.js"
import * as internal from "./internal/rcMap.js"
import { type Pipeable } from "./Pipeable.js"
import type * as Scope from "./Scope.js"
import type * as Types from "./Types.js"

/**
 * @since 3.5.0
 * @category type ids
 */
export const TypeId: unique symbol = internal.TypeId

/**
 * @since 3.5.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 3.5.0
 * @category models
 */
export interface RcMap<in K, out A, out E = never> extends Pipeable {
  readonly [TypeId]: RcMap.Variance<K, A, E>
}

/**
 * @since 3.5.0
 * @category models
 */
export declare namespace RcMap {
  /**
   * @since 3.5.0
   * @category models
   */
  export interface Variance<K, A, E> {
    readonly _K: Types.Contravariant<K>
    readonly _A: Types.Covariant<A>
    readonly _E: Types.Covariant<E>
  }
}

/**
 * An `RcMap` can contain multiple reference counted resources that can be indexed
 * by a key. The resources are lazily acquired on the first call to `get` and
 * released when the last reference is released.
 *
 * Complex keys can extend `Equal` and `Hash` to allow lookups by value.
 *
 * @since 3.5.0
 * @category models
 * @param capacity The maximum number of resources that can be held in the map.
 * @param idleTimeToLive When the reference count reaches zero, the resource will be released after this duration.
 * @example
 * import { Effect, RcMap } from "effect"
 *
 * Effect.gen(function*() {
 *   const map = yield* RcMap.make({
 *     lookup: (key: string) =>
 *       Effect.acquireRelease(
 *         Effect.succeed(`acquired ${key}`),
 *         () => Effect.log(`releasing ${key}`)
 *       )
 *   })
 *
 *   // Get "foo" from the map twice, which will only acquire it once.
 *   // It will then be released once the scope closes.
 *   yield* RcMap.get(map, "foo").pipe(
 *     Effect.andThen(RcMap.get(map, "foo")),
 *     Effect.scoped
 *   )
 * })
 */
export const make: {
  <K, A, E, R>(
    options: {
      readonly lookup: (key: K) => Effect.Effect<A, E, R>
      readonly idleTimeToLive?: Duration.DurationInput | undefined
      readonly capacity?: undefined
    }
  ): Effect.Effect<RcMap<K, A, E>, never, Scope.Scope | R>
  <K, A, E, R>(
    options: {
      readonly lookup: (key: K) => Effect.Effect<A, E, R>
      readonly idleTimeToLive?: Duration.DurationInput | undefined
      readonly capacity: number
    }
  ): Effect.Effect<RcMap<K, A, E | Cause.ExceededCapacityException>, never, Scope.Scope | R>
} = internal.make

/**
 * @since 3.5.0
 * @category combinators
 */
export const get: {
  <K>(key: K): <A, E>(self: RcMap<K, A, E>) => Effect.Effect<A, E, Scope.Scope>
  <K, A, E>(self: RcMap<K, A, E>, key: K): Effect.Effect<A, E, Scope.Scope>
} = internal.get

/**
 * @since 3.8.0
 * @category combinators
 */
export const keys: <K, A, E>(self: RcMap<K, A, E>) => Effect.Effect<Array<K>, E> = internal.keys
