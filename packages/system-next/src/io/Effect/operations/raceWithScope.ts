import * as O from "../../../data/Option"
import type { Scope } from "../../Scope"
import type { Exit } from "../../Exit/definition"
import type { Fiber } from "../../Fiber/definition"
import type { Effect } from "../definition"
import { IRaceWith } from "../definition/primitives"

/**
 * Returns an effect that races this effect with the specified effect, calling
 * the specified finisher as soon as one result or the other has been computed.
 *
 * @ets fluent ets/Effect raceWithScope
 */
export function raceWithScope_<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  left: Effect<R, E, A>,
  right: Effect<R1, E1, A1>,
  leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => Effect<R2, E2, A2>,
  rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => Effect<R3, E3, A3>,
  scope: Scope,
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
  leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => Effect<R2, E2, A2>,
  rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => Effect<R3, E3, A3>,
  scope: Scope,
  __trace?: string
) {
  return <R>(left: Effect<R, E, A>) =>
    raceWithScope_(left, right, leftWins, rightWins, scope, __trace)
}
