import type { Predicate } from "@fp-ts/data/Predicate"
import type { Refinement } from "@fp-ts/data/Refinement"

/**
 * Applies `f` if the predicate fails.
 *
 * @tsplus static effect/core/io/Effect.Aspects filterOrElseWith
 * @tsplus pipeable effect/core/io/Effect filterOrElseWith
 * @category filtering
 * @since 1.0.0
 */
export function filterOrElseWith<A, B extends A, R1, E1, A1>(
  f: Refinement<A, B>,
  orElse: (a: A) => Effect<R1, E1, A1>
): <R, E>(self: Effect<R, E, A>) => Effect<R | R1, E | E1, B | A1>
export function filterOrElseWith<A, R1, E1, A1>(
  f: Predicate<A>,
  orElse: (a: A) => Effect<R1, E1, A1>
): <R, E>(self: Effect<R, E, A>) => Effect<R | R1, E | E1, A | A1>
export function filterOrElseWith<A, R1, E1, A1>(
  f: Predicate<A>,
  orElse: (a: A) => Effect<R1, E1, A1>
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R | R1, E | E1, A | A1> =>
    self.flatMap((a) => (f(a) ? Effect.succeed<A | A1>(a) : orElse(a)))
}
