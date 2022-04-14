/**
 * A schedule that recurs for as long as the predicate is equal to the
 * specified value.
 *
 * @tsplus static ets/Schedule/Ops recurWhileEquals
 */
export function recurWhileEquals<A>(E: Equivalence<A>) {
  return (a: A): Schedule<void, unknown, A, A> => Schedule.identity<A>().whileInput((_) => E.equals(_, a));
}
