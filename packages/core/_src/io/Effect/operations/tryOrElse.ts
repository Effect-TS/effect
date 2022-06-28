import { IFold } from "@effect/core/io/Effect/definition/primitives"

/**
 * Executed `that` in case `self` fails with a `Cause` that doesn't contain
 * defects, executes `success` in case of successes
 *
 * @tsplus static effect/core/io/Effect.Aspects tryOrElse
 * @tsplus pipeable effect/core/io/Effect tryOrElse
 */
export function tryOrElse<R2, E2, A2, A, R3, E3, A3>(
  that: LazyArg<Effect<R2, E2, A2>>,
  success: (a: A) => Effect<R3, E3, A3>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R | R2 | R3, E2 | E3, A2 | A3> =>
    new IFold(
      self,
      (cause) => cause.keepDefects.fold(that, Effect.failCauseNow),
      success,
      __tsplusTrace
    )
}
