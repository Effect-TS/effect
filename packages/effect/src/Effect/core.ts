import type { Cause } from "../Cause/cause"
import { keepDefects } from "../Cause/core"
import * as Exit from "../Exit/core"
import type * as Fiber from "../Fiber"
import type { Descriptor, InterruptStatus } from "../Fiber/core"
import type { FiberID } from "../Fiber/id"
import { identity } from "../Function"
import * as O from "../Option"
import type { Supervisor } from "../Supervisor"
import { traceAs } from "../Tracing"
import type { FailureReporter } from "."
import type { Effect, IO, RIO, UIO } from "./effect"
import {
  ICheckExecutionTraces,
  ICheckInterrupt,
  IDescriptor,
  IEffectAsync,
  IEffectPartial,
  IEffectTotal,
  IFail,
  IFlatMap,
  IFold,
  IFork,
  IInterruptStatus,
  IProvide,
  IRead,
  ISucceed,
  ISupervise,
  ISuspend,
  ISuspendPartial,
  IYield
} from "./primitives"

/**
 * Effectfully accesses the environment of the effect.
 *
 * @module Effect
 * @trace 0
 * @trace point-free
 */
export function access<R0, A>(f: (_: R0) => A): RIO<R0, A> {
  return new IRead((_: R0) => new ISucceed(f(_)))
}

/**
 * Effectfully accesses the environment of the effect.
 *
 * @module Effect
 * @trace 0
 * @trace point-free
 */
export function accessM<R0, R, E, A>(
  f: (_: R0) => Effect<R, E, A>
): Effect<R & R0, E, A> {
  return new IRead(f)
}

/**
 * Returns an effect that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 *
 * @module Effect
 * @trace 0
 * @trace point-free
 */
export function chain<R1, E1, A1, A>(f: (a: A) => Effect<R1, E1, A1>) {
  return <R, E>(val: Effect<R, E, A>): Effect<R & R1, E | E1, A1> =>
    new IFlatMap(val, f)
}

/**
 * Returns an effect that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 *
 * @module Effect
 * @trace 1
 */
export function chain_<R, E, A, R1, E1, A1>(
  val: Effect<R, E, A>,
  f: (a: A) => Effect<R1, E1, A1>
): Effect<R & R1, E | E1, A1> {
  return new IFlatMap(val, f)
}

/**
 * Constructs an effect based on information about the current fiber, such as
 * its identity.
 *
 * @module Effect
 * @trace 0
 * @trace point-free
 */
export function descriptorWith<R, E, A>(
  f: (_: Descriptor) => Effect<R, E, A>
): Effect<R, E, A> {
  return new IDescriptor(f)
}

/**
 * Checks the interrupt status, and produces the effect returned by the
 * specified callback.
 *
 * @module Effect
 * @trace 0
 * @trace point-free
 */
export function checkInterruptible<R, E, A>(
  f: (_: InterruptStatus) => Effect<R, E, A>
): Effect<R, E, A> {
  return new ICheckInterrupt(f)
}

/**
 * Checks the interrupt status, and produces the effect returned by the
 * specified callback.
 *
 * @module Effect
 * @trace 0
 * @trace point-free
 */
export function checkExecutionTraces<R, E, A>(
  f: (_: readonly string[]) => Effect<R, E, A>
): Effect<R, E, A> {
  return new ICheckExecutionTraces(f)
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
 *
 * @module Effect
 * @trace 0
 */
export function effectAsyncOption<R, E, A>(
  register: (cb: (_: Effect<R, E, A>) => void) => O.Option<Effect<R, E, A>>,
  blockingOn: readonly FiberID[] = []
): Effect<R, E, A> {
  return new IEffectAsync(register, blockingOn)
}

/**
 * Imports a synchronous side-effect into a pure value, translating any
 * thrown exceptions into typed failed effects creating with `halt`.
 *
 * @module Effect
 * @trace 0
 * @trace point-free
 */
export function effectPartial<E>(onThrow: (u: unknown) => E) {
  return (
    /**
     * @module Effect
     * @trace 0
     * @trace point-free
     */
    <A>(effect: () => A): IO<E, A> => new IEffectPartial(effect, onThrow)
  )
}

/**
 * Imports a synchronous side-effect into a pure value, translating any
 * thrown exceptions into typed failed effects creating with `halt`.
 *
 * @module Effect
 * @trace 0
 * @trace point-free
 */
function try_<A>(effect: () => A): IO<unknown, A> {
  return new IEffectPartial(effect, identity)
}

export { try_ as try }

/**
 * Imports a synchronous side-effect into a pure value
 *
 * @module Effect
 * @trace 0
 * @trace point-free
 */
export function effectTotal<A>(effect: () => A): UIO<A> {
  return new IEffectTotal(effect)
}

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 *
 * @module Effect
 * @trace 0
 * @trace 1
 */
export function foldCauseM<E, A, R2, E2, A2, R3, E3, A3>(
  failure: (cause: Cause<E>) => Effect<R2, E2, A2>,
  success: (a: A) => Effect<R3, E3, A3>
) {
  return <R>(value: Effect<R, E, A>): Effect<R & R2 & R3, E2 | E3, A2 | A3> =>
    new IFold(value, failure, success)
}

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 *
 * @module Effect
 * @trace 1
 * @trace 2
 */
export function foldCauseM_<R, E, A, R2, E2, A2, R3, E3, A3>(
  value: Effect<R, E, A>,
  failure: (cause: Cause<E>) => Effect<R2, E2, A2>,
  success: (a: A) => Effect<R3, E3, A3>
): Effect<R & R2 & R3, E2 | E3, A2 | A3> {
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
 *
 * @module Effect
 * @trace replace 0
 * @trace point-free
 */
export function fork<R, E, A>(
  value: Effect<R, E, A>
): RIO<R, Fiber.FiberContext<E, A>> {
  return new IFork(value, O.none, O.none)
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
export function forkReport(reportFailure: FailureReporter) {
  return <R, E, A>(value: Effect<R, E, A>): RIO<R, Fiber.FiberContext<E, A>> =>
    new IFork(value, O.none, O.some(reportFailure))
}

/**
 * Returns an effect that models failure with the specified `Cause`.
 */
export function halt<E>(cause: Cause<E>): IO<E, never> {
  return new IFail(cause)
}

/**
 * Switches the interrupt status for this effect. If `true` is used, then the
 * effect becomes interruptible (the default), while if `false` is used, then
 * the effect becomes uninterruptible. These changes are compositional, so
 * they only affect regions of the effect.
 */
export function interruptStatus(flag: InterruptStatus) {
  return <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> =>
    new IInterruptStatus(effect, flag)
}

/**
 * Switches the interrupt status for this effect. If `true` is used, then the
 * effect becomes interruptible (the default), while if `false` is used, then
 * the effect becomes uninterruptible. These changes are compositional, so
 * they only affect regions of the effect.
 */
export function interruptStatus_<R, E, A>(
  effect: Effect<R, E, A>,
  flag: InterruptStatus
): Effect<R, E, A> {
  return new IInterruptStatus(effect, flag)
}

/**
 * Provides the `Effect` effect with its required environment, which eliminates
 * its dependency on `R`.
 */
export function provideAll<R>(r: R) {
  return <E, A>(next: Effect<R, E, A>): Effect<unknown, E, A> => new IProvide(r, next)
}

/**
 * Provides the `Effect` effect with its required environment, which eliminates
 * its dependency on `R`.
 */
export function provideAll_<R, E, A>(
  next: Effect<R, E, A>,
  r: R
): Effect<unknown, E, A> {
  return new IProvide(r, next)
}

/**
 * Returns an effect that semantically runs the effect on a fiber,
 * producing an `Exit` for the completion value of the fiber.
 */
export function result<R, E, A>(
  value: Effect<R, E, A>
): Effect<R, never, Exit.Exit<E, A>> {
  return new IFold(
    value,
    (cause) => succeed(Exit.halt(cause)),
    (succ) => succeed(Exit.succeed(succ))
  )
}

/**
 * Lift a pure value into an effect
 *
 * @module Effect
 * @trace replace 0
 * @trace point-free
 */
export function succeed<A>(a: A): Effect<unknown, never, A> {
  return new ISucceed(a)
}

/**
 * Returns an effect with the behavior of this one, but where all child
 * fibers forked in the effect are reported to the specified supervisor.
 */
export function supervised(supervisor: Supervisor<any>) {
  return <R, E, A>(fa: Effect<R, E, A>): Effect<R, E, A> =>
    new ISupervise(fa, supervisor).effect
}

/**
 * Returns a lazily constructed effect, whose construction may itself require effects.
 * When no environment is required (i.e., when R == unknown) it is conceptually equivalent to `flatten(effectTotal(io))`.
 *
 * @module Effect
 * @trace 0
 * @trace point-free
 */
export function suspend<R, E, A>(factory: () => Effect<R, E, A>): Effect<R, E, A> {
  return new ISuspend(factory)
}

/**
 * Returns a lazily constructed effect, whose construction may itself require effects.
 * When no environment is required (i.e., when R == unknown) it is conceptually equivalent to `flatten(effectPartial(orThrow, io))`.
 *
 * @module Effect
 * @trace 0
 * @trace point-free
 */
export function suspendPartial<E2>(onThrow: (u: unknown) => E2) {
  return (
    /**
     * @module Effect
     * @trace 0
     * @trace point-free
     */
    <R, E, A>(factory: () => Effect<R, E, A>): Effect<R, E | E2, A> =>
      new ISuspendPartial(factory, onThrow)
  )
}

/**
 * Executed `that` in case `self` fails with a `Cause` that doesn't contain defects,
 * executes `success` in case of successes
 *
 * @module Effect
 * @trace 1
 * @trace 2
 */
export function tryOrElse_<R, E, A, R2, E2, A2, R3, E3, A3>(
  self: Effect<R, E, A>,
  that: () => Effect<R2, E2, A2>,
  success: (a: A) => Effect<R3, E3, A3>
): Effect<R & R2 & R3, E2 | E3, A2 | A3> {
  return new IFold(
    self,
    traceAs((cause) => O.fold_(keepDefects(cause), that, halt), that),
    success
  )
}

/**
 * Executed `that` in case `self` fails with a `Cause` that doesn't contain defects,
 * executes `success` in case of successes
 *
 * @module Effect
 * @trace 0
 * @trace 1
 */
export function tryOrElse<A, R2, E2, A2, R3, E3, A3>(
  that: () => Effect<R2, E2, A2>,
  success: (a: A) => Effect<R3, E3, A3>
): <R, E>(self: Effect<R, E, A>) => Effect<R & R2 & R3, E2 | E3, A2 | A3> {
  return (self) => tryOrElse_(self, that, success)
}

/**
 * Returns the effect resulting from mapping the success of this effect to unit.
 */
export const unit: UIO<void> = succeed(undefined)

/**
 * Returns an effect that yields to the runtime system, starting on a fresh
 * stack. Manual use of this method can improve fairness, at the cost of
 * overhead.
 */
export const yieldNow: UIO<void> = new IYield()
