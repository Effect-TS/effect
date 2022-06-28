/**
 * A schedule that recurs for until the predicate is equal.
 *
 * @tsplus static effect/core/io/Schedule.Ops recurUntilEquals
 */
export function recurUntilEquals<A>(E: Equivalence<A>, value: A): Schedule<void, unknown, A, A> {
  return Schedule.identity<A>().untilInput((_) => E.equals(_, value))
}
