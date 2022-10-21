/**
 * A schedule that recurs for until the predicate evaluates to true.
 *
 * @tsplus static effect/core/io/Schedule.Ops recurUntilEffect
 */
export function recurUntilEffect<Env, A>(
  f: (a: A) => Effect<Env, never, boolean>
): Schedule<void, Env, A, A> {
  return Schedule.identity<A>().untilInputEffect(f)
}
