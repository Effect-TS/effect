// ets_tracing: off

import type { Cause } from "../Cause/cause.js"
import { keepDefects } from "../Cause/core.js"
import * as Exit from "../Exit/core.js"
import type * as Fiber from "../Fiber/index.js"
import { identity } from "../Function/index.js"
import * as O from "../Option/index.js"
import type { Supervisor } from "../Supervisor/index.js"
import type { Effect, IO, RIO, UIO } from "./effect.js"
import type { FailureReporter } from "./primitives.js"
import {
  ICheckInterrupt,
  ICheckTracingStatus,
  IDescriptor,
  IEffectAsync,
  IEffectPartial,
  IEffectTotal,
  IFail,
  IFlatMap,
  IFold,
  IFork,
  IInterruptStatus,
  IPlatform,
  IProvide,
  IRead,
  ISucceed,
  ISupervise,
  ISuspend,
  ISuspendPartial,
  ITrace,
  ITracingStatus,
  IYield
} from "./primitives.js"

/**
 * Effectfully accesses the environment of the effect.
 */
export function access<R0, A>(f: (_: R0) => A, __trace?: string): RIO<R0, A> {
  return new IRead((_: R0) => new ISucceed(f(_)), __trace)
}

/**
 * Effectfully accesses the environment of the effect.
 */
export function accessM<R0, R, E, A>(
  f: (_: R0) => Effect<R, E, A>,
  __trace?: string
): Effect<R & R0, E, A> {
  return new IRead(f, __trace)
}

/**
 * Returns an effect that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 *
 * @ets_data_first chain_
 */
export function chain<R1, E1, A1, A>(
  f: (a: A) => Effect<R1, E1, A1>,
  __trace?: string
) {
  return <R, E>(val: Effect<R, E, A>): Effect<R & R1, E | E1, A1> =>
    new IFlatMap(val, f, __trace)
}

/**
 * Returns an effect that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 */
export function chain_<R, E, A, R1, E1, A1>(
  val: Effect<R, E, A>,
  f: (a: A) => Effect<R1, E1, A1>,
  __trace?: string
): Effect<R & R1, E | E1, A1> {
  return new IFlatMap(val, f, __trace)
}

/**
 * Constructs an effect based on information about the current fiber, such as
 * its identity.
 */
export function descriptorWith<R, E, A>(
  f: (_: Fiber.Descriptor) => Effect<R, E, A>,
  __trace?: string
): Effect<R, E, A> {
  return new IDescriptor(f, __trace)
}

/**
 * Checks the interrupt status, and produces the effect returned by the
 * specified callback.
 */
export function checkInterruptible<R, E, A>(
  f: (_: Fiber.InterruptStatus) => Effect<R, E, A>,
  __trace?: string
): Effect<R, E, A> {
  return new ICheckInterrupt(f, __trace)
}

/**
 * Capture trace at the current point
 */
export const trace: UIO<Fiber.Trace> = new ITrace()

/**
 * Checks the tracing status, and produces the effect returned by the
 * specified callback.
 */
export function checkTraced<R, E, A>(
  f: (_: boolean) => Effect<R, E, A>
): Effect<R, E, A> {
  return new ICheckTracingStatus(f)
}

/**
 * Disables Effect tracing facilities for the duration of the effect.
 *
 * Note: Effect tracing is cached, as such after the first iteration
 * it has a negligible effect on performance of hot-spots (Additional
 * hash map lookup per flatMap). As such, using `untraced` sections
 * is not guaranteed to result in a noticeable performance increase.
 */
export function untraced<R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> {
  return new ITracingStatus(self, false)
}

/**
 * Enables Effect tracing for this effect. Because this is the default, this
 * operation only has an additional meaning if the effect is located within
 * an `untraced` section, or the current fiber has been spawned by a parent
 * inside an `untraced` section.
 */
export function traced<R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> {
  return new ITracingStatus(self, true)
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
  register: (cb: (_: Effect<R, E, A>) => void) => O.Option<Effect<R, E, A>>,
  __trace?: string
): Effect<R, E, A> {
  return new IEffectAsync(register, [], __trace)
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
export function effectAsyncOptionBlockingOn<R, E, A>(
  register: (cb: (_: Effect<R, E, A>) => void) => O.Option<Effect<R, E, A>>,
  blockingOn: readonly Fiber.FiberID[],
  __trace?: string
): Effect<R, E, A> {
  return new IEffectAsync(register, blockingOn, __trace)
}

/**
 * Imports a synchronous side-effect into a pure value, translating any
 * thrown exceptions into typed failed effects creating with `halt`.
 */
export function tryCatch<E, A>(
  effect: () => A,
  onThrow: (u: unknown) => E,
  __trace?: string
): IO<E, A> {
  return new IEffectPartial(effect, onThrow, __trace)
}

/**
 * Imports a synchronous side-effect into a pure value, translating any
 * thrown exceptions into typed failed effects creating with `halt`.
 */
function try_<A>(effect: () => A, __trace?: string): IO<unknown, A> {
  return new IEffectPartial(effect, identity, __trace)
}

export { try_ as try }

/**
 * Imports a synchronous side-effect into a pure value
 */
export function succeedWith<A>(effect: () => A, __trace?: string): UIO<A> {
  return new IEffectTotal(effect, __trace)
}

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 *
 * @ets_data_first foldCauseM_
 */
export function foldCauseM<E, A, R2, E2, A2, R3, E3, A3>(
  failure: (cause: Cause<E>) => Effect<R2, E2, A2>,
  success: (a: A) => Effect<R3, E3, A3>,
  __trace?: string
) {
  return <R>(value: Effect<R, E, A>): Effect<R & R2 & R3, E2 | E3, A2 | A3> =>
    new IFold(value, failure, success, __trace)
}

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export function foldCauseM_<R, E, A, R2, E2, A2, R3, E3, A3>(
  value: Effect<R, E, A>,
  failure: (cause: Cause<E>) => Effect<R2, E2, A2>,
  success: (a: A) => Effect<R3, E3, A3>,
  __trace?: string
): Effect<R & R2 & R3, E2 | E3, A2 | A3> {
  return new IFold(value, failure, success, __trace)
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
export function fork<R, E, A>(
  value: Effect<R, E, A>,
  __trace?: string
): RIO<R, Fiber.FiberContext<E, A>> {
  return new IFork(value, O.none, O.none, __trace)
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
 *
 * @ets_data_first forkReport_
 */
export function forkReport(reportFailure: FailureReporter, __trace?: string) {
  return <R, E, A>(value: Effect<R, E, A>): RIO<R, Fiber.FiberContext<E, A>> =>
    new IFork(value, O.none, O.some(reportFailure), __trace)
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
export function forkReport_<R, E, A>(
  value: Effect<R, E, A>,
  reportFailure: FailureReporter,
  __trace?: string
): RIO<R, Fiber.FiberContext<E, A>> {
  return new IFork(value, O.none, O.some(reportFailure), __trace)
}

/**
 * Returns an effect that models failure with the specified `Cause`.
 */
export function halt<E>(cause: Cause<E>, __trace?: string): IO<E, never> {
  return new IFail(() => cause, __trace)
}

/**
 * Returns an effect that models failure with the specified `Cause`.
 *
 * This version takes in a lazily-evaluated trace that can be attached to the `Cause`
 * via `Cause.Traced`.
 */
export function haltWith<E>(
  cause: (_: () => Fiber.Trace) => Cause<E>,
  __trace?: string
): IO<E, never> {
  return new IFail(cause, __trace)
}

/**
 * Switches the interrupt status for this effect. If `true` is used, then the
 * effect becomes interruptible (the default), while if `false` is used, then
 * the effect becomes uninterruptible. These changes are compositional, so
 * they only affect regions of the effect.
 *
 * @ets_data_first interruptStatus_
 */
export function interruptStatus(flag: Fiber.InterruptStatus, __trace?: string) {
  return <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> =>
    new IInterruptStatus(effect, flag, __trace)
}

/**
 * Switches the interrupt status for this effect. If `true` is used, then the
 * effect becomes interruptible (the default), while if `false` is used, then
 * the effect becomes uninterruptible. These changes are compositional, so
 * they only affect regions of the effect.
 */
export function interruptStatus_<R, E, A>(
  effect: Effect<R, E, A>,
  flag: Fiber.InterruptStatus,
  __trace?: string
): Effect<R, E, A> {
  return new IInterruptStatus(effect, flag, __trace)
}

/**
 * Toggles Effect tracing support for this effect. If `true` is used, then the
 * effect will accumulate traces, while if `false` is used, then tracing
 * is disabled. These changes are compositional, so they only affect regions
 * of the effect.
 *
 * @ets_data_first tracingStatus_
 */
export function tracingStatus(flag: boolean) {
  return <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> =>
    new ITracingStatus(effect, flag)
}

/**
 * Toggles Effect tracing support for this effect. If `true` is used, then the
 * effect will accumulate traces, while if `false` is used, then tracing
 * is disabled. These changes are compositional, so they only affect regions
 * of the effect.
 */
export function tracingStatus_<R, E, A>(
  effect: Effect<R, E, A>,
  flag: boolean
): Effect<R, E, A> {
  return new ITracingStatus(effect, flag)
}

/**
 * Provides the `Effect` effect with its required environment, which eliminates
 * its dependency on `R`.
 *
 * @ets_data_first provideAll_
 */
export function provideAll<R>(r: R, __trace?: string) {
  return <E, A>(next: Effect<R, E, A>): Effect<unknown, E, A> =>
    new IProvide(r, next, __trace)
}

/**
 * Provides the `Effect` effect with its required environment, which eliminates
 * its dependency on `R`.
 */
export function provideAll_<R, E, A>(
  next: Effect<R, E, A>,
  r: R,
  __trace?: string
): Effect<unknown, E, A> {
  return new IProvide(r, next, __trace)
}

/**
 * Returns an effect that semantically runs the effect on a fiber,
 * producing an `Exit` for the completion value of the fiber.
 */
export function result<R, E, A>(
  value: Effect<R, E, A>,
  __trace?: string
): Effect<R, never, Exit.Exit<E, A>> {
  return new IFold(
    value,
    (cause) => succeed(Exit.halt(cause)),
    (succ) => succeed(Exit.succeed(succ)),
    __trace
  )
}

/**
 * Lift a pure value into an effect
 */
export function succeed<A>(a: A, __trace?: string): Effect<unknown, never, A> {
  return new ISucceed(a, __trace)
}

/**
 * Returns an effect with the behavior of this one, but where all child
 * fibers forked in the effect are reported to the specified supervisor.
 *
 * @ets_data_first supervised_
 */
export function supervised(supervisor: Supervisor<any>, __trace?: string) {
  return <R, E, A>(fa: Effect<R, E, A>): Effect<R, E, A> =>
    new ISupervise(fa, supervisor, __trace)
}

/**
 * Returns an effect with the behavior of this one, but where all child
 * fibers forked in the effect are reported to the specified supervisor.
 */
export function supervised_<R, E, A>(
  fa: Effect<R, E, A>,
  supervisor: Supervisor<any>,
  __trace?: string
): Effect<R, E, A> {
  return new ISupervise(fa, supervisor, __trace)
}

/**
 * Returns a lazily constructed effect, whose construction may itself require effects.
 * When no environment is required (i.e., when R == unknown) it is conceptually equivalent to `flatten(succeedWith(io))`.
 */
export function suspend<R, E, A>(
  factory: (platform: Fiber.Platform<unknown>, id: Fiber.FiberID) => Effect<R, E, A>,
  __trace?: string
): Effect<R, E, A> {
  return new ISuspend(factory, __trace)
}

/**
 * Returns a lazily constructed effect, whose construction may itself require effects.
 * When no environment is required (i.e., when R == unknown) it is conceptually equivalent to `flatten(tryCatch(orThrow, io))`.
 */
export function tryCatchSuspend<R, E, A, E2>(
  factory: (platform: Fiber.Platform<unknown>, id: Fiber.FiberID) => Effect<R, E, A>,
  onThrow: (u: unknown) => E2,
  __trace?: string
): Effect<R, E | E2, A> {
  return new ISuspendPartial(factory, onThrow, __trace)
}

/**
 * Executed `that` in case `self` fails with a `Cause` that doesn't contain defects,
 * executes `success` in case of successes
 */
export function tryOrElse_<R, E, A, R2, E2, A2, R3, E3, A3>(
  self: Effect<R, E, A>,
  that: () => Effect<R2, E2, A2>,
  success: (a: A) => Effect<R3, E3, A3>,
  __trace?: string
): Effect<R & R2 & R3, E2 | E3, A2 | A3> {
  return new IFold(
    self,
    (cause) => O.fold_(keepDefects(cause), that, halt),
    success,
    __trace
  )
}

/**
 * Executed `that` in case `self` fails with a `Cause` that doesn't contain defects,
 * executes `success` in case of successes
 *
 * @ets_data_first tryOrElse_
 */
export function tryOrElse<A, R2, E2, A2, R3, E3, A3>(
  that: () => Effect<R2, E2, A2>,
  success: (a: A) => Effect<R3, E3, A3>,
  __trace?: string
): <R, E>(self: Effect<R, E, A>) => Effect<R & R2 & R3, E2 | E3, A2 | A3> {
  return (self) => tryOrElse_(self, that, success, __trace)
}

/**
 * Returns the effect resulting from mapping the success of this effect to unit.
 */
export const unit: UIO<void> = new ISucceed(undefined)

/**
 * Returns the effect resulting from mapping the success of this effect to unit.
 */
export const unitTraced = (__trace?: string): UIO<void> =>
  new ISucceed(undefined, __trace)

/**
 * Returns an effect that yields to the runtime system, starting on a fresh
 * stack. Manual use of this method can improve fairness, at the cost of
 * overhead.
 */
export const yieldNow: UIO<void> = new IYield()

/**
 * Checks the current platform
 */
export function checkPlatform<R, E, A>(
  f: (_: Fiber.Platform<unknown>) => Effect<R, E, A>,
  __trace?: string
): Effect<R, E, A> {
  return new IPlatform(f, __trace)
}
