import type { Exit } from "../Exit/exit"
import type * as Fiber from "../Fiber"
import type { Runtime } from "../Fiber/core"
import * as O from "../Option"
import type { Scope } from "../Scope"
import { globalScope } from "../Scope"
import { succeed } from "./core"
import type { Effect, RIO, UIO } from "./effect"
import { IFork, IGetForkScope, IOverrideForkScope, IRaceWith } from "./primitives"

/**
 * Retrieves the scope that will be used to supervise forked effects.
 */
export const forkScope: UIO<Scope<Exit<any, any>>> = new IGetForkScope(succeed)

export class ForkScopeRestore {
  constructor(private scope: Scope<Exit<any, any>>) {}

  readonly restore = <R, E, A>(fa: Effect<R, E, A>): Effect<R, E, A> =>
    new IOverrideForkScope(fa, O.some(this.scope))
}

/**
 * Captures the fork scope, before overriding it with the specified new
 * scope, passing a function that allows restoring the fork scope to
 * what it was originally.
 */
export function forkScopeMask(newScope: Scope<Exit<any, any>>) {
  return <R, E, A>(f: (restore: ForkScopeRestore) => Effect<R, E, A>) =>
    forkScopeWith(
      (scope) =>
        new IOverrideForkScope(f(new ForkScopeRestore(scope)), O.some(newScope))
    )
}

/**
 * Returns an effect that races this effect with the specified effect, calling
 * the specified finisher as soon as one result or the other has been computed.
 */
export function raceWith<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  left: Effect<R, E, A>,
  right: Effect<R1, E1, A1>,
  leftWins: (exit: Exit<E, A>, fiber: Fiber.Fiber<E1, A1>) => Effect<R2, E2, A2>,
  rightWins: (exit: Exit<E1, A1>, fiber: Fiber.Fiber<E, A>) => Effect<R3, E3, A3>,
  scope: O.Option<Scope<Exit<any, any>>> = O.none
): Effect<R & R1 & R2 & R3, E2 | E3, A2 | A3> {
  return new IRaceWith(left, right, leftWins, rightWins, scope)
}

export type Grafter = <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>

/**
 * Transplants specified effects so that when those effects fork other
 * effects, the forked effects will be governed by the scope of the
 * fiber that executes this effect.
 *
 * This can be used to "graft" deep grandchildren onto a higher-level
 * scope, effectively extending their lifespans into the parent scope.
 */
export function transplant<R, E, A>(f: (_: Grafter) => Effect<R, E, A>) {
  return forkScopeWith((scope) => f((e) => new IOverrideForkScope(e, O.some(scope))))
}

/**
 * Forks the effect into a new fiber attached to the global scope. Because the
 * new fiber is attached to the global scope, when the fiber executing the
 * returned effect terminates, the forked fiber will continue running.
 */
export function forkDaemon<R, E, A>(
  value: Effect<R, E, A>
): RIO<R, Fiber.FiberContext<E, A>> {
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
export function forkIn(scope: Scope<Exit<any, any>>) {
  return <R, E, A>(value: Effect<R, E, A>): RIO<R, Runtime<E, A>> =>
    new IFork(value, O.some(scope))
}

/**
 * Retrieves the scope that will be used to supervise forked effects.
 */
export function forkScopeWith<R, E, A>(
  f: (_: Scope<Exit<any, any>>) => Effect<R, E, A>
) {
  return new IGetForkScope(f)
}

/**
 * Returns a new effect that will utilize the specified scope to supervise
 * any fibers forked within the original effect.
 */
export function overrideForkScope(scope: Scope<Exit<any, any>>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    new IOverrideForkScope(self, O.some(scope))
}

/**
 * Returns a new effect that will utilize the specified scope to supervise
 * any fibers forked within the original effect.
 */
export function overrideForkScope_<R, E, A>(
  self: Effect<R, E, A>,
  scope: Scope<Exit<any, any>>
): Effect<R, E, A> {
  return new IOverrideForkScope(self, O.some(scope))
}
