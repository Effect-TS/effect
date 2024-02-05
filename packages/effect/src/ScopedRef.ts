/**
 * @since 2.0.0
 */
import type * as Effect from "./Effect.js"
import type { LazyArg } from "./Function.js"
import * as internal from "./internal/scopedRef.js"
import type { Pipeable } from "./Pipeable.js"
import type * as Scope from "./Scope.js"
import type * as Synchronized from "./SynchronizedRef.js"
import type * as Types from "./Types.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const ScopedRefTypeId: unique symbol = internal.ScopedRefTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type ScopedRefTypeId = typeof ScopedRefTypeId

/**
 * A `ScopedRef` is a reference whose value is associated with resources,
 * which must be released properly. You can both get the current value of any
 * `ScopedRef`, as well as set it to a new value (which may require new
 * resources). The reference itself takes care of properly releasing resources
 * for the old value whenever a new value is obtained.
 *
 * @since 2.0.0
 * @category models
 */
export interface ScopedRef<in out A> extends ScopedRef.Variance<A>, Pipeable {
  /** @internal */
  readonly ref: Synchronized.SynchronizedRef<readonly [Scope.Scope.Closeable, A]>
}

/**
 * @since 2.0.0
 */
export declare namespace ScopedRef {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<in out A> {
    readonly [ScopedRefTypeId]: {
      readonly _A: Types.Invariant<A>
    }
  }
}

/**
 * Creates a new `ScopedRef` from an effect that resourcefully produces a
 * value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromAcquire: <A, E, R>(
  acquire: Effect.Effect<A, E, R>
) => Effect.Effect<ScopedRef<A>, E, Scope.Scope | R> = internal.fromAcquire

/**
 * Retrieves the current value of the scoped reference.
 *
 * @since 2.0.0
 * @category getters
 */
export const get: <A>(self: ScopedRef<A>) => Effect.Effect<A> = internal.get

/**
 * Creates a new `ScopedRef` from the specified value. This method should
 * not be used for values whose creation require the acquisition of resources.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <A>(evaluate: LazyArg<A>) => Effect.Effect<ScopedRef<A>, never, Scope.Scope> = internal.make

/**
 * Sets the value of this reference to the specified resourcefully-created
 * value. Any resources associated with the old value will be released.
 *
 * This method will not return until either the reference is successfully
 * changed to the new value, with old resources released, or until the attempt
 * to acquire a new value fails.
 *
 * @since 2.0.0
 * @category getters
 */
export const set: {
  <A, R, E>(acquire: Effect.Effect<A, E, R>): (self: ScopedRef<A>) => Effect.Effect<void, E, Exclude<R, Scope.Scope>>
  <A, R, E>(self: ScopedRef<A>, acquire: Effect.Effect<A, E, R>): Effect.Effect<void, E, Exclude<R, Scope.Scope>>
} = internal.set
