import * as Equal from "@fp-ts/data/Equal"

/**
 * A schedule that recurs for until the predicate is equal.
 *
 * @tsplus static effect/core/io/Schedule.Ops recurUntilEquals
 * @category mutations
 * @since 1.0.0
 */
export function recurUntilEquals<A>(value: A): Schedule<void, never, A, A> {
  return Schedule.identity<A>().untilInput((_) => Equal.equals(_, value))
}
