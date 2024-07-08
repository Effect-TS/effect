/**
 * @since 3.5.0
 */
import type * as Duration from "./Duration.js"
import type * as Effect from "./Effect.js"
import * as internal from "./internal/rcRef.js"
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
export interface RcRef<out A, out E = never> extends Pipeable {
  readonly [TypeId]: RcRef.Variance<A, E>
}

/**
 * @since 3.5.0
 * @category models
 */
export declare namespace RcRef {
  /**
   * @since 3.5.0
   * @category models
   */
  export interface Variance<A, E> {
    readonly _A: Types.Covariant<A>
    readonly _E: Types.Covariant<E>
  }
}

/**
 * Create an `RcRef` from an acquire `Effect`.
 *
 * An RcRef wraps a reference counted resource that can be acquired and released
 * multiple times.
 *
 * The resource is lazily acquired on the first call to `get` and released when
 * the last reference is released.
 *
 * @since 3.5.0
 * @category constructors
 * @example
 * import { Effect, RcRef } from "effect"
 *
 * Effect.gen(function*() {
 *   const ref = yield* RcRef.make({
 *     acquire: Effect.acquireRelease(
 *       Effect.succeed("foo"),
 *       () => Effect.log("release foo")
 *     )
 *   })
 *
 *   // will only acquire the resource once, and release it
 *   // when the scope is closed
 *   yield* RcRef.get(ref).pipe(
 *     Effect.andThen(RcRef.get(ref)),
 *     Effect.scoped
 *   )
 * })
 */
export const make: <A, E, R>(
  options: {
    readonly acquire: Effect.Effect<A, E, R>
    /**
     * When the reference count reaches zero, the resource will be released
     * after this duration.
     */
    readonly idleTimeToLive?: Duration.DurationInput | undefined
  }
) => Effect.Effect<RcRef<A, E>, never, R | Scope.Scope> = internal.make

/**
 * @since 3.5.0
 * @category combinators
 */
export const get: <A, E>(self: RcRef<A, E>) => Effect.Effect<A, E, Scope.Scope> = internal.get
