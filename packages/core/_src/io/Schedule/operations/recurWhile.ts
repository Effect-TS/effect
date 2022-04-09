/**
 * A schedule that recurs for as long as the predicate evaluates to true.
 *
 * @tsplus static ets/Schedule/Ops recurWhile
 */
export function recurWhile<A>(
  f: Predicate<A>
): Schedule.WithState<void, unknown, A, A> {
  return Schedule.identity<A>().whileInput(f);
}
