import { OpOnSuccessAndFailure } from "@effect/core/stable/Effect/definition"

/**
 * @tsplus pipeable Effectect/core/stable/Effect foldCauseEffect
 */
export function foldCauseEffect<E, A, R1, E1, A1, R2, E2, A2>(
  failureK: (e: Cause<E>) => Effect2<R1, E1, A1>,
  successK: (a: A) => Effect2<R2, E2, A2>
): <R>(first: Effect2<R, E, A>) => Effect2<R | R1 | R2, E1 | E2, A1 | A2> {
  return (first) => new OpOnSuccessAndFailure(first, failureK, successK)
}
