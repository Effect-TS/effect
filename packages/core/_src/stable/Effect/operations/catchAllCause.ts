import { OpOnFailure } from "@effect/core/stable/Effect/definition"

/**
 * @tsplus pipeable Effectect/core/stable/Effect catchAllCause
 */
export function catchAllCause<E, R1, E1, A1>(
  failureK: (e: Cause<E>) => Effect2<R1, E1, A1>
): <R, A>(first: Effect2<R, E, A>) => Effect2<R | R1, E1, A | A1> {
  return (first) => new OpOnFailure(first, failureK)
}
