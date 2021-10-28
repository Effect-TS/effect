// ets_tracing: off

import type * as CS from "../Cause"
import * as E from "../Either"
import * as Ex from "../Exit"
import { tapExit_ } from "."
import type { Effect } from "./effect"

/**
 * Returns an effect that effectfully "peeks" at the result of this effect as an `Either`.
 */
export function tapEither_<R, R1, E, E1, A, A1>(
  self: Effect<R, E, A>,
  f: (exit: E.Either<CS.Cause<E>, A>) => Effect<R1, E1, A1>,
  __trace?: string
): Effect<R & R1, E | E1, A> {
  return tapExit_(self, (exit) => f(Ex.fold_(exit, E.left, E.right)), __trace)
}

/**
 * Returns an effect that effectfully "peeks" at the result of this effect as an `Either`.
 *
 * @ets_data_first tapEither_
 */
export function tapEither<R1, E, E1, A, A1>(
  f: (exit: E.Either<CS.Cause<E>, A>) => Effect<R1, E1, A1>,
  __trace?: string
) {
  return <R>(self: Effect<R, E, A>) => tapEither_(self, f, __trace)
}
