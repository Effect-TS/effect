// ets_tracing: off

import { keepDefects } from "../../Cause"
import * as O from "../../Option"
import type { Effect } from "../definition"
import { IFold } from "../definition"
import { failCause } from "./failCause"

/**
 * Executed `that` in case `self` fails with a `Cause` that doesn't contain
 * defects, executes `success` in case of successes
 */
export function tryOrElse_<R, E, A, R2, E2, A2, R3, E3, A3>(
  self: Effect<R, E, A>,
  that: () => Effect<R2, E2, A2>,
  success: (a: A) => Effect<R3, E3, A3>,
  __trace?: string
): Effect<R & R2 & R3, E2 | E3, A2 | A3> {
  return new IFold(
    self,
    (cause) => O.fold_(keepDefects(cause), that, failCause),
    success,
    __trace
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
  __trace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R2 & R3, E2 | E3, A2 | A3> =>
    tryOrElse_(self, that, success, __trace)
}
