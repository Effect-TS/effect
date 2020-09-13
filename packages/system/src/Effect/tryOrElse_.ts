import { keepDefects } from "../Cause/core"
import * as O from "../Option"
import { halt } from "./core"
import type { Effect } from "./effect"
import { IFold } from "./primitives"

/**
 * Executed `that` in case `self` fails with a `Cause` that doesn't contain defects,
 * executes `success` in case of successes
 */
export function tryOrElse_<S, R, E, A, S2, R2, E2, A2, S3, R3, E3, A3>(
  self: Effect<S, R, E, A>,
  that: () => Effect<S2, R2, E2, A2>,
  success: (a: A) => Effect<S3, R3, E3, A3>
): Effect<S | S2 | S3, R & R2 & R3, E2 | E3, A2 | A3> {
  return new IFold(self, (cause) => O.fold_(keepDefects(cause), that, halt), success)
}

/**
 * Executed `that` in case `self` fails with a `Cause` that doesn't contain defects,
 * executes `success` in case of successes
 */
export function tryOrElse<A, S2, R2, E2, A2, S3, R3, E3, A3>(
  that: () => Effect<S2, R2, E2, A2>,
  success: (a: A) => Effect<S3, R3, E3, A3>
): <S, R, E>(
  self: Effect<S, R, E, A>
) => Effect<S | S2 | S3, R & R2 & R3, E2 | E3, A2 | A3> {
  return (self) => tryOrElse_(self, that, success)
}
