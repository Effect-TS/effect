import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import type { Exit } from "../../Exit/definition"
import type { Fiber } from "../../Fiber/definition"
import { Effect } from "../definition"
import { IRaceWith } from "../definition/primitives"

/**
 * Returns an effect that races this effect with the specified effect, calling
 * the specified finisher as soon as one result or the other has been computed.
 *
 * @tsplus fluent ets/Effect raceWith
 */
export function raceWith_<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R1, E1, A1>>,
  leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => Effect<R2, E2, A2>,
  rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => Effect<R3, E3, A3>,
  __etsTrace?: string
): Effect<R & R1 & R2 & R3, E2 | E3, A2 | A3> {
  return Effect.suspendSucceed(
    new IRaceWith(
      () => self,
      that,
      leftWins,
      rightWins,
      () => Option.none,
      __etsTrace
    )
  )
}

/**
 * Returns an effect that races this effect with the specified effect, calling
 * the specified finisher as soon as one result or the other has been computed.
 *
 * @ets_data_first raceWith_
 */
export function raceWith<E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  that: LazyArg<Effect<R1, E1, A1>>,
  leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => Effect<R2, E2, A2>,
  rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => Effect<R3, E3, A3>,
  __etsTrace?: string
) {
  return <R>(self: Effect<R, E, A>) => self.raceWith(that, leftWins, rightWins)
}
