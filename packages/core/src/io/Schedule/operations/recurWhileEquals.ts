import * as Equal from "@fp-ts/data/Equal"

/**
 * A schedule that recurs for as long as the predicate is equal to the
 * specified value.
 *
 * @tsplus static effect/core/io/Schedule.Ops recurWhileEquals
 * @category mutations
 * @since 1.0.0
 */
export function recurWhileEquals<A>(value: A): Schedule<void, never, A, A> {
  return Schedule.identity<A>().whileInput((_) => Equal.equals(_, value))
}
