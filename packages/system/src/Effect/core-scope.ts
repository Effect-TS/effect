// ets_tracing: off

import type { Exit } from "../Exit/exit.js"
import type { Runtime } from "../Fiber/core.js"
import type * as Fiber from "../Fiber/index.js"
import * as O from "../Option/index.js"
import type { Scope } from "../Scope/index.js"
import { globalScope } from "../Scope/index.js"
import { succeed } from "./core.js"
import type { Effect, RIO, UIO } from "./effect.js"
import type { FailureReporter } from "./primitives.js"
import { IFork, IGetForkScope, IOverrideForkScope, IRaceWith } from "./primitives.js"

/**
 * Retrieves the scope that will be used to supervise forked effects.
 */
export const forkScope: UIO<Scope<Exit<any, any>>> = new IGetForkScope(succeed)

export class ForkScopeRestore {
  constructor(private scope: Scope<Exit<any, any>>) {}

  readonly restore = <R, E, A>(
    fa: Effect<R, E, A>,
    __trace?: string
  ): Effect<R, E, A> => new IOverrideForkScope(fa, O.some(this.scope), __trace)
}

/**
 * Captures the fork scope, before overriding it with the specified new
 * scope, passing a function that allows restoring the fork scope to
 * what it was originally.
 */
export function forkScopeMask_<R, E, A>(
  newScope: Scope<Exit<any, any>>,
  f: (restore: ForkScopeRestore) => Effect<R, E, A>,
  __trace?: string
) {
  return forkScopeWith(
    (scope) => new IOverrideForkScope(f(new ForkScopeRestore(scope)), O.some(newScope)),
    __trace
  )
}

/**
 * Captures the fork scope, before overriding it with the specified new
 * scope, passing a function that allows restoring the fork scope to
 * what it was originally.
 *
 * @ets_data_first forkScopeMask_
 */
export function forkScopeMask<R, E, A>(
  f: (restore: ForkScopeRestore) => Effect<R, E, A>,
  __trace?: string
) {
  return (newScope: Scope<Exit<any, any>>) => forkScopeMask_(newScope, f, __trace)
}

/**
 * Returns an effect that races this effect with the specified effect, calling
 * the specified finisher as soon as one result or the other has been computed.
 */
export function raceWithScope_<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  left: Effect<R, E, A>,
  right: Effect<R1, E1, A1>,
  leftWins: (exit: Exit<E, A>, fiber: Fiber.Fiber<E1, A1>) => Effect<R2, E2, A2>,
  rightWins: (exit: Exit<E1, A1>, fiber: Fiber.Fiber<E, A>) => Effect<R3, E3, A3>,
  scope: Scope<Exit<any, any>>,
  __trace?: string
): Effect<R & R1 & R2 & R3, E2 | E3, A2 | A3> {
  return new IRaceWith(left, right, leftWins, rightWins, O.some(scope), __trace)
}

/**
 * Returns an effect that races this effect with the specified effect, calling
 * the specified finisher as soon as one result or the other has been computed.
 *
 * @ets_data_first raceWithScope_
 */
export function raceWithScope<E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  right: Effect<R1, E1, A1>,
  leftWins: (exit: Exit<E, A>, fiber: Fiber.Fiber<E1, A1>) => Effect<R2, E2, A2>,
  rightWins: (exit: Exit<E1, A1>, fiber: Fiber.Fiber<E, A>) => Effect<R3, E3, A3>,
  scope: Scope<Exit<any, any>>,
  __trace?: string
) {
  return <R>(left: Effect<R, E, A>) =>
    raceWithScope_(left, right, leftWins, rightWins, scope, __trace)
}

/**
 * Returns an effect that races this effect with the specified effect, calling
 * the specified finisher as soon as one result or the other has been computed.
 */
export function raceWith_<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  left: Effect<R, E, A>,
  right: Effect<R1, E1, A1>,
  leftWins: (exit: Exit<E, A>, fiber: Fiber.Fiber<E1, A1>) => Effect<R2, E2, A2>,
  rightWins: (exit: Exit<E1, A1>, fiber: Fiber.Fiber<E, A>) => Effect<R3, E3, A3>,
  __trace?: string
): Effect<R & R1 & R2 & R3, E2 | E3, A2 | A3> {
  return new IRaceWith(left, right, leftWins, rightWins, O.none, __trace)
}

/**
 * Returns an effect that races this effect with the specified effect, calling
 * the specified finisher as soon as one result or the other has been computed.
 *
 * @ets_data_first raceWith_
 */
export function raceWith<E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  right: Effect<R1, E1, A1>,
  leftWins: (exit: Exit<E, A>, fiber: Fiber.Fiber<E1, A1>) => Effect<R2, E2, A2>,
  rightWins: (exit: Exit<E1, A1>, fiber: Fiber.Fiber<E, A>) => Effect<R3, E3, A3>,
  __trace?: string
) {
  return <R>(left: Effect<R, E, A>) =>
    raceWith_(left, right, leftWins, rightWins, __trace)
}

/**
 * Graft function
 */
export type Grafter = <R, E, A>(
  effect: Effect<R, E, A>,
  __trace?: string
) => Effect<R, E, A>

/**
 * Transplants specified effects so that when those effects fork other
 * effects, the forked effects will be governed by the scope of the
 * fiber that executes this effect.
 *
 * This can be used to "graft" deep grandchildren onto a higher-level
 * scope, effectively extending their lifespans into the parent scope.
 */
export function transplant<R, E, A>(
  f: (_: Grafter) => Effect<R, E, A>,
  __trace?: string
) {
  return forkScopeWith(
    (scope) => f((e, __trace) => new IOverrideForkScope(e, O.some(scope), __trace)),
    __trace
  )
}

/**
 * Forks the effect into a new fiber attached to the global scope. Because the
 * new fiber is attached to the global scope, when the fiber executing the
 * returned effect terminates, the forked fiber will continue running.
 */
export function forkDaemon<R, E, A>(
  value: Effect<R, E, A>,
  __trace?: string
): RIO<R, Fiber.FiberContext<E, A>> {
  return new IFork(value, O.some(globalScope), O.none, __trace)
}

/**
 * Forks the effect into a new fiber attached to the global scope. Because the
 * new fiber is attached to the global scope, when the fiber executing the
 * returned effect terminates, the forked fiber will continue running.
 *
 * @ets_data_first forkDaemonReport_
 */
export function forkDaemonReport(reportFailure: FailureReporter, __trace?: string) {
  return <R, E, A>(value: Effect<R, E, A>): RIO<R, Fiber.FiberContext<E, A>> =>
    forkDaemonReport_(value, reportFailure, __trace)
}

/**
 * Forks the effect into a new fiber attached to the global scope. Because the
 * new fiber is attached to the global scope, when the fiber executing the
 * returned effect terminates, the forked fiber will continue running.
 */
export function forkDaemonReport_<R, E, A>(
  value: Effect<R, E, A>,
  reportFailure: FailureReporter,
  __trace?: string
): RIO<R, Fiber.FiberContext<E, A>> {
  return new IFork(value, O.some(globalScope), O.some(reportFailure), __trace)
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
 * @ets_data_first forkIn_
 */
export function forkIn(scope: Scope<Exit<any, any>>, __trace?: string) {
  return <R, E, A>(value: Effect<R, E, A>): RIO<R, Runtime<E, A>> =>
    forkIn_(value, scope, __trace)
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
export function forkIn_<R, E, A>(
  value: Effect<R, E, A>,
  scope: Scope<Exit<any, any>>,
  __trace?: string
): RIO<R, Runtime<E, A>> {
  return new IFork(value, O.some(scope), O.none, __trace)
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
 * @ets_data_first forkInReport_
 */
export function forkInReport(
  scope: Scope<Exit<any, any>>,
  reportFailure: FailureReporter,
  __trace?: string
) {
  return <R, E, A>(value: Effect<R, E, A>): RIO<R, Runtime<E, A>> =>
    new IFork(value, O.some(scope), O.some(reportFailure), __trace)
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
export function forkInReport_<R, E, A>(
  value: Effect<R, E, A>,
  scope: Scope<Exit<any, any>>,
  reportFailure: FailureReporter,
  __trace?: string
): RIO<R, Runtime<E, A>> {
  return new IFork(value, O.some(scope), O.some(reportFailure), __trace)
}

/**
 * Retrieves the scope that will be used to supervise forked effects.
 */
export function forkScopeWith<R, E, A>(
  f: (_: Scope<Exit<any, any>>) => Effect<R, E, A>,
  __trace?: string
): Effect<R, E, A> {
  return new IGetForkScope(f, __trace)
}

/**
 * Returns a new effect that will utilize the specified scope to supervise
 * any fibers forked within the original effect.
 *
 * @ets_data_first overrideForkScope_
 */
export function overrideForkScope(scope: Scope<Exit<any, any>>, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    new IOverrideForkScope(self, O.some(scope), __trace)
}

/**
 * Returns a new effect that will utilize the specified scope to supervise
 * any fibers forked within the original effect.
 */
export function overrideForkScope_<R, E, A>(
  self: Effect<R, E, A>,
  scope: Scope<Exit<any, any>>,
  __trace?: string
): Effect<R, E, A> {
  return new IOverrideForkScope(self, O.some(scope), __trace)
}

/**
 * Returns a new effect that will utilize the default scope (fiber scope) to
 * supervise any fibers forked within the original effect.
 */
export function resetForkScope<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): Effect<R, E, A> {
  return new IOverrideForkScope(self, O.none, __trace)
}
