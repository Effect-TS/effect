/**
 * A schedule that recurs for until the predicate is equal.
 *
 * @tsplus static ets/Schedule/Ops recurUntilEquals
 */
export function recurUntilEquals<A>(E: Equivalence<A>) {
  return (a: A): Schedule.WithState<void, unknown, A, A> => Schedule.identity<A>().untilInput((_) => E.equals(_, a));
}
