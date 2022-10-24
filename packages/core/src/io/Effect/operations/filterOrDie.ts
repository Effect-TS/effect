import type { Predicate } from "@fp-ts/data/Predicate"
import type { Refinement } from "@fp-ts/data/Refinement"

/**
 * Dies with specified defect if the predicate fails.
 *
 * @tsplus static effect/core/io/Effect.Aspects filterOrDie
 * @tsplus pipeable effect/core/io/Effect filterOrDie
 * @category filtering
 * @since 1.0.0
 */
export function filterOrDie<A, B extends A>(
  f: Refinement<A, B>,
  defect: LazyArg<unknown>
): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>
export function filterOrDie<A>(
  f: Predicate<A>,
  defect: LazyArg<unknown>
): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>
export function filterOrDie<A>(
  f: Predicate<A>,
  defect: LazyArg<unknown>
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E, A> =>
    Effect.$.filterOrElse(f, Effect.dieSync(defect))(self)
}
