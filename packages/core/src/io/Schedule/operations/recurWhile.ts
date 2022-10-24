import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * A schedule that recurs for as long as the predicate evaluates to true.
 *
 * @tsplus static effect/core/io/Schedule.Ops recurWhile
 * @category mutations
 * @since 1.0.0
 */
export function recurWhile<A>(f: Predicate<A>): Schedule<void, never, A, A> {
  return Schedule.identity<A>().whileInput(f)
}
