/**
 * A schedule that recurs for until the predicate evaluates to true.
 *
 * @tsplus static ets/Schedule/Ops recurUntilEffect
 */
export function recurUntilEffect<Env, A>(
  f: (a: A) => Effect.RIO<Env, boolean>
): Schedule<void, Env, A, A> {
  return Schedule.identity<A>().untilInputEffect(f);
}
