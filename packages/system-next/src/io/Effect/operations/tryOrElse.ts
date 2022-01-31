import * as O from "../../../data/Option"
import { keepDefects } from "../../Cause"
import { Effect, IFold } from "../definition"

/**
 * Executed `that` in case `self` fails with a `Cause` that doesn't contain
 * defects, executes `success` in case of successes
 *
 * @tsplus fluent ets/Effect tryOrElse
 */
export function tryOrElse_<R, E, A, R2, E2, A2, R3, E3, A3>(
  self: Effect<R, E, A>,
  that: () => Effect<R2, E2, A2>,
  success: (a: A) => Effect<R3, E3, A3>,
  __etsTrace?: string
): Effect<R & R2 & R3, E2 | E3, A2 | A3> {
  return new IFold(
    self,
    (cause) => O.fold_(keepDefects(cause), that, Effect.failCauseNow),
    success,
    __etsTrace
  )
}

/**
 * Executed `that` in case `self` fails with a `Cause` that doesn't contain
 * defects, executes `success` in case of successes
 *
 * @ets_data_first tryOrElse_
 */
export function tryOrElse<R2, E2, A2, B, A, R3, E3, A3>(
  that: () => Effect<R2, E2, A2>,
  success: (a: A) => Effect<R3, E3, A3>,
  __etsTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R2 & R3, E2 | E3, A2 | A3> =>
    tryOrElse_(self, that, success)
}
