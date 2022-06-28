/**
 * A schedule that recurs for as long as the predicate is equal to the
 * specified value.
 *
 * @tsplus static effect/core/io/Schedule.Ops recurWhileEquals
 */
export function recurWhileEquals<A>(E: Equivalence<A>, value: A): Schedule<void, never, A, A> {
  return Schedule.identity<A>().whileInput((_) => E.equals(_, value))
}
