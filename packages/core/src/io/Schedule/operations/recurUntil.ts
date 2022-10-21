/**
 * A schedule that recurs for until the predicate evaluates to true.
 *
 * @tsplus static effect/core/io/Schedule.Ops recurUntil
 */
export function recurUntil<A>(
  f: Predicate<A>
): Schedule<void, never, A, A> {
  return Schedule.identity<A>().untilInput(f)
}
