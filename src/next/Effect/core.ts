import * as O from "../../Option"
import { Cause } from "../Cause/cause"
import * as Exit from "../Exit/exit"
import * as Fiber from "../Fiber"
import { Descriptor, InterruptStatus, Runtime } from "../Fiber/core"
import { FiberID } from "../Fiber/id"
import { globalScope, Scope } from "../Scope"

import { Cb } from "./Cb"
import { AsyncR, AsyncRE, Effect, Sync, SyncE, SyncR } from "./effect"
import {
  ICheckInterrupt,
  IDescriptor,
  IEffectAsync,
  IEffectPartial,
  IEffectTotal,
  IFail,
  IFlatMap,
  IFold,
  IFork,
  IGetForkScope,
  IInterruptStatus,
  IProvide,
  IRaceWith,
  IRead,
  ISucceed,
  ISuspend,
  ISuspendPartial,
  IYield
} from "./primitives"

/**
 * Effectfully accesses the environment of the effect.
 */
export function access<R0, A>(f: (_: R0) => A): SyncR<R0, A> {
  return new IRead((_: R0) => new ISucceed(f(_)))
}

/**
 * Effectfully accesses the environment of the effect.
 */
export function accessM<R0, S, R, E, A>(
  f: (_: R0) => Effect<S, R, E, A>
): Effect<S, R & R0, E, A> {
  return new IRead(f)
}

/**
 * Returns an effect that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 */
export function chain<S1, R1, E1, A1, A>(f: (a: A) => Effect<S1, R1, E1, A1>) {
  return <S, R, E>(val: Effect<S, R, E, A>): Effect<S | S1, R & R1, E | E1, A1> =>
    new IFlatMap(val, f)
}

/**
 * Returns an effect that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 */
export function chain_<S, R, E, A, S1, R1, E1, A1>(
  val: Effect<S, R, E, A>,
  f: (a: A) => Effect<S1, R1, E1, A1>
): Effect<S | S1, R & R1, E | E1, A1> {
  return new IFlatMap(val, f)
}

/**
 * Constructs an effect based on information about the current fiber, such as
 * its identity.
 */
export function checkDescriptor<S, R, E, A>(
  f: (_: Descriptor) => Effect<S, R, E, A>
): Effect<S, R, E, A> {
  return new IDescriptor(f)
}

/**
 * Checks the interrupt status, and produces the effect returned by the
 * specified callback.
 */
export function checkInterrupt<S, R, E, A>(
  f: (_: InterruptStatus) => Effect<S, R, E, A>
): Effect<S, R, E, A> {
  return new ICheckInterrupt(f)
}

/**
 * Imports an asynchronous side-effect into a pure `Effect` value. See
 * `effectAsyncOption` for the more expressive variant of this function that
 * can return a value synchronously.
 *
 * The callback function must be called at most once.
 *
 * The list of fibers, that may complete the async callback, is used to
 * provide better diagnostics.
 */
export function effectAsync<R, E, A>(
  register: (cb: Cb<AsyncRE<R, E, A>>) => void,
  blockingOn: readonly FiberID[] = []
): AsyncRE<R, E, A> {
  return new IEffectAsync((cb) => {
    register(cb)
    return O.none
  }, blockingOn)
}

/**
 * Imports an asynchronous effect into a pure `Effect` value, possibly returning
 * the value synchronously.
 *
 * If the register function returns a value synchronously, then the callback
 * function `AsyncRE<R, E, A> => void` must not be called. Otherwise the callback
 * function must be called at most once.
 *
 * The list of fibers, that may complete the async callback, is used to
 * provide better diagnostics.
 */
export function effectAsyncOption<R, E, A>(
  register: (cb: (_: AsyncRE<R, E, A>) => void) => O.Option<AsyncRE<R, E, A>>,
  blockingOn: readonly FiberID[] = []
): AsyncRE<R, E, A> {
  return new IEffectAsync(register, blockingOn)
}

/**
 * Imports a synchronous side-effect into a pure value, translating any
 * thrown exceptions into typed failed effects creating with `halt`.
 */
export function effectPartial<E>(onThrow: (u: unknown) => E) {
  return <A>(effect: () => A): SyncE<E, A> => new IEffectPartial(effect, onThrow)
}

/**
 * Imports a synchronous side-effect into a pure value
 */
export function effectTotal<A>(effect: () => A): Sync<A> {
  return new IEffectTotal(effect)
}

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export function foldCauseM<E, A, S2, R2, E2, A2, S3, R3, E3, A3>(
  failure: (cause: Cause<E>) => Effect<S2, R2, E2, A2>,
  success: (a: A) => Effect<S3, R3, E3, A3>
) {
  return <S, R>(
    value: Effect<S, R, E, A>
  ): Effect<S | S2 | S3, R & R2 & R3, E2 | E3, A2 | A3> =>
    new IFold(value, failure, success)
}

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export function foldCauseM_<S, R, E, A, S2, R2, E2, A2, S3, R3, E3, A3>(
  value: Effect<S, R, E, A>,
  failure: (cause: Cause<E>) => Effect<S2, R2, E2, A2>,
  success: (a: A) => Effect<S3, R3, E3, A3>
): Effect<S | S2 | S3, R & R2 & R3, E2 | E3, A2 | A3> {
  return new IFold(value, failure, success)
}

/**
 * Returns an effect that forks this effect into its own separate fiber,
 * returning the fiber immediately, without waiting for it to begin
 * executing the effect.
 *
 * The returned fiber can be used to interrupt the forked fiber, await its
 * result, or join the fiber. See `Fiber` for more information.
 *
 * The fiber is forked with interrupt supervision mode, meaning that when the
 * fiber that forks the child exits, the child will be interrupted.
 */
export function fork<S, R, E, A>(
  value: Effect<S, R, E, A>
): AsyncR<R, Fiber.FiberContext<E, A>> {
  return new IFork(value, O.none)
}

/**
 * Forks the effect into a new fiber attached to the global scope. Because the
 * new fiber is attached to the global scope, when the fiber executing the
 * returned effect terminates, the forked fiber will continue running.
 */
export function forkDaemon<S, R, E, A>(
  value: Effect<S, R, E, A>
): AsyncR<R, Fiber.FiberContext<E, A>> {
  return new IFork(value, O.some(globalScope))
}

/**
 * Returns an effect that forks this effect into its own separate fiber,
 * returning the fiber immediately, without waiting for it to begin
 * executing the effect.
 *
 * The returned fiber can be used to interrupt the forked fiber, await its
 * result, or join the fiber. See `Fiber` for more information.
 *
 * The fiber is forked with interrupt supervision mode, meaning that when the
 * fiber that forks the child exits, the child will be interrupted.
 */
export function forkIn(scope: Scope<Exit.Exit<any, any>>) {
  return <S, R, E, A>(value: Effect<S, R, E, A>): AsyncR<R, Runtime<E, A>> =>
    new IFork(value, O.some(scope))
}

/**
 * Retrieves the scope that will be used to supervise forked effects.
 */
export function forkScopeWith<S, R, E, A>(
  f: (_: Scope<Exit.Exit<any, any>>) => Effect<S, R, E, A>
) {
  return new IGetForkScope(f)
}

/**
 * Returns an effect that models failure with the specified `Cause`.
 */
export function halt<E>(cause: Cause<E>): SyncE<E, never> {
  return new IFail(cause)
}

/**
 * Switches the interrupt status for this effect. If `true` is used, then the
 * effect becomes interruptible (the default), while if `false` is used, then
 * the effect becomes uninterruptible. These changes are compositional, so
 * they only affect regions of the effect.
 */
export function interruptStatus(flag: InterruptStatus) {
  return <S, R, E, A>(effect: Effect<S, R, E, A>): Effect<S, R, E, A> =>
    new IInterruptStatus(effect, flag)
}

/**
 * Switches the interrupt status for this effect. If `true` is used, then the
 * effect becomes interruptible (the default), while if `false` is used, then
 * the effect becomes uninterruptible. These changes are compositional, so
 * they only affect regions of the effect.
 */
export function interruptStatus_<S, R, E, A>(
  effect: Effect<S, R, E, A>,
  flag: InterruptStatus
): Effect<S, R, E, A> {
  return new IInterruptStatus(effect, flag)
}

/**
 * Provides the `Effect` effect with its required environment, which eliminates
 * its dependency on `R`.
 */
export function provideAll<R>(r: R) {
  return <S, E, A>(next: Effect<S, R, E, A>): Effect<S, unknown, E, A> =>
    new IProvide(r, next)
}

/**
 * Provides the `Effect` effect with its required environment, which eliminates
 * its dependency on `R`.
 */
export function provideAll_<S, R, E, A>(
  next: Effect<S, R, E, A>,
  r: R
): Effect<S, unknown, E, A> {
  return new IProvide(r, next)
}

/**
 * Returns an effect that races this effect with the specified effect, calling
 * the specified finisher as soon as one result or the other has been computed.
 */
export function raceWith<S, R, E, A, S1, R1, E1, A1, S2, R2, E2, A2, S3, R3, E3, A3>(
  left: Effect<S, R, E, A>,
  right: Effect<S1, R1, E1, A1>,
  leftWins: (
    exit: Exit.Exit<E, A>,
    fiber: Fiber.Fiber<E1, A1>
  ) => Effect<S2, R2, E2, A2>,
  rightWins: (
    exit: Exit.Exit<E1, A1>,
    fiber: Fiber.Fiber<E, A>
  ) => Effect<S3, R3, E3, A3>,
  scope: O.Option<Scope<Exit.Exit<any, any>>> = O.none
): Effect<unknown, R & R1 & R2 & R3, E2 | E3, A2 | A3> {
  return new IRaceWith(left, right, leftWins, rightWins, scope)
}

/**
 * Lift a pure value into an effect
 */
export function succeed<A>(a: A): Effect<never, unknown, never, A> {
  return new ISucceed(a)
}

/**
 * Returns a lazily constructed effect, whose construction may itself require effects.
 * When no environment is required (i.e., when R == unknown) it is conceptually equivalent to `flatten(effectTotal(io))`.
 */
export function suspend<S, R, E, A>(
  factory: () => Effect<S, R, E, A>
): Effect<S, R, E, A> {
  return new ISuspend(factory)
}

/**
 * Returns a lazily constructed effect, whose construction may itself require effects.
 * When no environment is required (i.e., when R == unknown) it is conceptually equivalent to `flatten(effectPartial(orThrow, io))`.
 */
export function suspendPartial<E2>(onThrow: (u: unknown) => E2) {
  return <S, R, E, A>(factory: () => Effect<S, R, E, A>): Effect<S, R, E | E2, A> =>
    new ISuspendPartial(factory, onThrow)
}

/**
 * Returns the effect resulting from mapping the success of this effect to unit.
 */
export const unit: Sync<void> = succeed(undefined)

/**
 * Returns an effect that yields to the runtime system, starting on a fresh
 * stack. Manual use of this method can improve fairness, at the cost of
 * overhead.
 */
export const yieldNow = new IYield()
