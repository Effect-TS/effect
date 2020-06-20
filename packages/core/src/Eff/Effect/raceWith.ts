import * as O from "../../Option"
import { Exit } from "../Exit/exit"
import { Fiber } from "../Fiber/fiber"
import { Scope } from "../Scope"

import { Effect } from "./effect"
import { IRaceWith } from "./primitives"

/**
 * Returns an effect that races this effect with the specified effect, calling
 * the specified finisher as soon as one result or the other has been computed.
 */
export const raceWith = <S, R, E, A, S1, R1, E1, A1, S2, R2, E2, A2, S3, R3, E3, A3>(
  left: Effect<S, R, E, A>,
  right: Effect<S1, R1, E1, A1>,
  leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => Effect<S2, R2, E2, A2>,
  rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => Effect<S3, R3, E3, A3>,
  scope: O.Option<Scope<Exit<any, any>>> = O.none
): Effect<unknown, R & R1 & R2 & R3, E2 | E3, A2 | A3> =>
  new IRaceWith(left, right, leftWins, rightWins, scope)
