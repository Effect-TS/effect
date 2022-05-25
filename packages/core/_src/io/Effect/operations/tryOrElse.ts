import { IFold } from "@effect/core/io/Effect/definition/primitives"

/**
 * Executed `that` in case `self` fails with a `Cause` that doesn't contain
 * defects, executes `success` in case of successes
 *
 * @tsplus fluent ets/Effect tryOrElse
 */
export function tryOrElse_<R, E, A, R2, E2, A2, R3, E3, A3>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  success: (a: A) => Effect<R3, E3, A3>,
  __tsplusTrace?: string
): Effect<R & R2 & R3, E2 | E3, A2 | A3> {
  return new IFold(
    self,
    (cause) => cause.keepDefects().fold(that, Effect.failCauseNow),
    success,
    __tsplusTrace
  )
}

/**
 * Executed `that` in case `self` fails with a `Cause` that doesn't contain
 * defects, executes `success` in case of successes
 *
 * @tsplus static ets/Effect/Aspects tryOrElse
 */
export const tryOrElse = Pipeable(tryOrElse_)
