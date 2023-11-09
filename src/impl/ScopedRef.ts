/**
 * @since 2.0.0
 */
import type * as Effect from "../Effect.js"
import type { LazyArg } from "../Function.js"
import * as internal from "../internal/scopedRef.js"
import type * as Scope from "../Scope.js"
import type { ScopedRef } from "../ScopedRef.js"

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
 * Creates a new `ScopedRef` from an effect that resourcefully produces a
 * value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromAcquire: <R, E, A>(
  acquire: Effect.Effect<R, E, A>
) => Effect.Effect<Scope.Scope | R, E, ScopedRef<A>> = internal.fromAcquire

/**
 * Retrieves the current value of the scoped reference.
 *
 * @since 2.0.0
 * @category getters
 */
export const get: <A>(self: ScopedRef<A>) => Effect.Effect<never, never, A> = internal.get

/**
 * Creates a new `ScopedRef` from the specified value. This method should
 * not be used for values whose creation require the acquisition of resources.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <A>(evaluate: LazyArg<A>) => Effect.Effect<Scope.Scope, never, ScopedRef<A>> = internal.make

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
  <A, R, E>(acquire: Effect.Effect<R, E, A>): (self: ScopedRef<A>) => Effect.Effect<Exclude<R, Scope.Scope>, E, void>
  <A, R, E>(self: ScopedRef<A>, acquire: Effect.Effect<R, E, A>): Effect.Effect<Exclude<R, Scope.Scope>, E, void>
} = internal.set
