/**
 * @since 2.0.0
 */
import type * as Cause from "./Cause.js"
import type * as Effect from "./Effect.js"
import type * as Exit from "./Exit.js"
import type * as FiberId from "./FiberId.js"
import type { LazyArg } from "./Function.js"
import * as core from "./internal/core.js"
import * as internal from "./internal/deferred.js"
import type * as MutableRef from "./MutableRef.js"
import type * as Option from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import type * as Types from "./Types.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const DeferredTypeId: unique symbol = internal.DeferredTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type DeferredTypeId = typeof DeferredTypeId

/**
 * A `Deferred` represents an asynchronous variable that can be set exactly
 * once, with the ability for an arbitrary number of fibers to suspend (by
 * calling `Deferred.await`) and automatically resume when the variable is set.
 *
 * `Deferred` can be used for building primitive actions whose completions
 * require the coordinated action of multiple fibers, and for building
 * higher-level concurrent or asynchronous structures.
 *
 * @since 2.0.0
 * @category models
 */
export interface Deferred<in out E, in out A> extends Deferred.Variance<E, A>, Pipeable {
  /** @internal */
  readonly state: MutableRef.MutableRef<internal.State<E, A>>
  /** @internal */
  readonly blockingOn: FiberId.FiberId
}

/**
 * @since 2.0.0
 */
export declare namespace Deferred {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<in out E, in out A> {
    readonly [DeferredTypeId]: {
      readonly _E: Types.Invariant<E>
      readonly _A: Types.Invariant<A>
    }
  }
}

/**
 * Creates a new `Deferred`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <E, A>() => Effect.Effect<never, never, Deferred<E, A>> = core.deferredMake

/**
 * Creates a new `Deferred` from the specified `FiberId`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const makeAs: <E, A>(fiberId: FiberId.FiberId) => Effect.Effect<never, never, Deferred<E, A>> =
  core.deferredMakeAs

const _await: <E, A>(self: Deferred<E, A>) => Effect.Effect<never, E, A> = core.deferredAwait

export {
  /**
   * Retrieves the value of the `Deferred`, suspending the fiber running the
   * workflow until the result is available.
   *
   * @since 2.0.0
   * @category getters
   */
  _await as await
}

/**
 * Completes the deferred with the result of the specified effect. If the
 * deferred has already been completed, the method will produce false.
 *
 * Note that `Deferred.completeWith` will be much faster, so consider using
 * that if you do not need to memoize the result of the specified effect.
 *
 * @since 2.0.0
 * @category utils
 */
export const complete: {
  <E, A>(effect: Effect.Effect<never, E, A>): (self: Deferred<E, A>) => Effect.Effect<never, never, boolean>
  <E, A>(self: Deferred<E, A>, effect: Effect.Effect<never, E, A>): Effect.Effect<never, never, boolean>
} = core.deferredComplete

/**
 * Completes the deferred with the result of the specified effect. If the
 * deferred has already been completed, the method will produce false.
 *
 * @since 2.0.0
 * @category utils
 */
export const completeWith: {
  <E, A>(effect: Effect.Effect<never, E, A>): (self: Deferred<E, A>) => Effect.Effect<never, never, boolean>
  <E, A>(self: Deferred<E, A>, effect: Effect.Effect<never, E, A>): Effect.Effect<never, never, boolean>
} = core.deferredCompleteWith

/**
 * Exits the `Deferred` with the specified `Exit` value, which will be
 * propagated to all fibers waiting on the value of the `Deferred`.
 *
 * @since 2.0.0
 * @category utils
 */
export const done: {
  <E, A>(exit: Exit.Exit<E, A>): (self: Deferred<E, A>) => Effect.Effect<never, never, boolean>
  <E, A>(self: Deferred<E, A>, exit: Exit.Exit<E, A>): Effect.Effect<never, never, boolean>
} = core.deferredDone

/**
 * Fails the `Deferred` with the specified error, which will be propagated to
 * all fibers waiting on the value of the `Deferred`.
 *
 * @since 2.0.0
 * @category utils
 */
export const fail: {
  <E>(error: E): <A>(self: Deferred<E, A>) => Effect.Effect<never, never, boolean>
  <E, A>(self: Deferred<E, A>, error: E): Effect.Effect<never, never, boolean>
} = core.deferredFail

/**
 * Fails the `Deferred` with the specified error, which will be propagated to
 * all fibers waiting on the value of the `Deferred`.
 *
 * @since 2.0.0
 * @category utils
 */
export const failSync: {
  <E>(evaluate: LazyArg<E>): <A>(self: Deferred<E, A>) => Effect.Effect<never, never, boolean>
  <E, A>(self: Deferred<E, A>, evaluate: LazyArg<E>): Effect.Effect<never, never, boolean>
} = core.deferredFailSync

/**
 * Fails the `Deferred` with the specified `Cause`, which will be propagated to
 * all fibers waiting on the value of the `Deferred`.
 *
 * @since 2.0.0
 * @category utils
 */
export const failCause: {
  <E>(cause: Cause.Cause<E>): <A>(self: Deferred<E, A>) => Effect.Effect<never, never, boolean>
  <E, A>(self: Deferred<E, A>, cause: Cause.Cause<E>): Effect.Effect<never, never, boolean>
} = core.deferredFailCause

/**
 * Fails the `Deferred` with the specified `Cause`, which will be propagated to
 * all fibers waiting on the value of the `Deferred`.
 *
 * @since 2.0.0
 * @category utils
 */
export const failCauseSync: {
  <E>(evaluate: LazyArg<Cause.Cause<E>>): <A>(self: Deferred<E, A>) => Effect.Effect<never, never, boolean>
  <E, A>(self: Deferred<E, A>, evaluate: LazyArg<Cause.Cause<E>>): Effect.Effect<never, never, boolean>
} = core.deferredFailCauseSync

/**
 * Kills the `Deferred` with the specified defect, which will be propagated to
 * all fibers waiting on the value of the `Deferred`.
 *
 * @since 2.0.0
 * @category utils
 */
export const die: {
  (defect: unknown): <E, A>(self: Deferred<E, A>) => Effect.Effect<never, never, boolean>
  <E, A>(self: Deferred<E, A>, defect: unknown): Effect.Effect<never, never, boolean>
} = core.deferredDie

/**
 * Kills the `Deferred` with the specified defect, which will be propagated to
 * all fibers waiting on the value of the `Deferred`.
 *
 * @since 2.0.0
 * @category utils
 */
export const dieSync: {
  (evaluate: LazyArg<unknown>): <E, A>(self: Deferred<E, A>) => Effect.Effect<never, never, boolean>
  <E, A>(self: Deferred<E, A>, evaluate: LazyArg<unknown>): Effect.Effect<never, never, boolean>
} = core.deferredDieSync

/**
 * Completes the `Deferred` with interruption. This will interrupt all fibers
 * waiting on the value of the `Deferred` with the `FiberId` of the fiber
 * calling this method.
 *
 * @since 2.0.0
 * @category utils
 */
export const interrupt: <E, A>(self: Deferred<E, A>) => Effect.Effect<never, never, boolean> = core.deferredInterrupt

/**
 * Completes the `Deferred` with interruption. This will interrupt all fibers
 * waiting on the value of the `Deferred` with the specified `FiberId`.
 *
 * @since 2.0.0
 * @category utils
 */
export const interruptWith: {
  (fiberId: FiberId.FiberId): <E, A>(self: Deferred<E, A>) => Effect.Effect<never, never, boolean>
  <E, A>(self: Deferred<E, A>, fiberId: FiberId.FiberId): Effect.Effect<never, never, boolean>
} = core.deferredInterruptWith

/**
 * Returns `true` if this `Deferred` has already been completed with a value or
 * an error, `false` otherwise.
 *
 * @since 2.0.0
 * @category getters
 */
export const isDone: <E, A>(self: Deferred<E, A>) => Effect.Effect<never, never, boolean> = core.deferredIsDone

/**
 * Returns a `Some<Effect<R, E, A>>` from the `Deferred` if this `Deferred` has
 * already been completed, `None` otherwise.
 *
 * @since 2.0.0
 * @category getters
 */
export const poll: <E, A>(
  self: Deferred<E, A>
) => Effect.Effect<never, never, Option.Option<Effect.Effect<never, E, A>>> = core.deferredPoll

/**
 * Completes the `Deferred` with the specified value.
 *
 * @since 2.0.0
 * @category utils
 */
export const succeed: {
  <A>(value: A): <E>(self: Deferred<E, A>) => Effect.Effect<never, never, boolean>
  <E, A>(self: Deferred<E, A>, value: A): Effect.Effect<never, never, boolean>
} = core.deferredSucceed

/**
 * Completes the `Deferred` with the specified lazily evaluated value.
 *
 * @since 2.0.0
 * @category utils
 */
export const sync: {
  <A>(evaluate: LazyArg<A>): <E>(self: Deferred<E, A>) => Effect.Effect<never, never, boolean>
  <E, A>(self: Deferred<E, A>, evaluate: LazyArg<A>): Effect.Effect<never, never, boolean>
} = core.deferredSync

/**
 * Unsafely creates a new `Deferred` from the specified `FiberId`.
 *
 * @since 2.0.0
 * @category unsafe
 */
export const unsafeMake: <E, A>(fiberId: FiberId.FiberId) => Deferred<E, A> = core.deferredUnsafeMake

/**
 * Unsafely exits the `Deferred` with the specified `Exit` value, which will be
 * propagated to all fibers waiting on the value of the `Deferred`.
 *
 * @since 2.0.0
 * @category unsafe
 */
export const unsafeDone: <E, A>(self: Deferred<E, A>, effect: Effect.Effect<never, E, A>) => void =
  core.deferredUnsafeDone
