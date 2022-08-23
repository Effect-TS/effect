import { IOnSuccessAndFailure } from "@effect/core/io/Effect/definition/primitives"

/**
 * A more powerful version of `foldEffect` that allows recovering from any kind
 * of failure except interruptions.
 *
 * @tsplus static effect/core/io/Effect.Aspects foldCauseEffect
 * @tsplus pipeable effect/core/io/Effect foldCauseEffect
 */
export function foldCauseEffect<E, A, R2, E2, A2, R3, E3, A3>(
  failure: (cause: Cause<E>) => Effect<R2, E2, A2>,
  success: (a: A) => Effect<R3, E3, A3>
) {
  return <R>(self: Effect<R, E, A>): Effect<R | R2 | R3, E2 | E3, A2 | A3> =>
    new IOnSuccessAndFailure(self, success, failure)
}
