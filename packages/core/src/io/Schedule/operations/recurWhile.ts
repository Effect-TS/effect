/**
 * A schedule that recurs for as long as the predicate evaluates to true.
 *
 * @tsplus static effect/core/io/Schedule.Ops recurWhile
 */
export function recurWhile<A>(
  f: Predicate<A>
): Schedule<void, never, A, A> {
  return Schedule.identity<A>().whileInput(f)
}
