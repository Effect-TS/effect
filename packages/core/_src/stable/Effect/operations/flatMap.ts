import { OpOnSuccess } from "@effect/core/stable/Effect/definition"

/**
 * @tsplus pipeable Effectect/core/stable/Effect flatMap
 */
export function flatMap<A, R1, E1, A1>(
  successK: (a: A) => Effect2<R1, E1, A1>
): <R, E>(first: Effect2<R, E, A>) => Effect2<R | R1, E | E1, A1> {
  return (first) => new OpOnSuccess(first, successK)
}
