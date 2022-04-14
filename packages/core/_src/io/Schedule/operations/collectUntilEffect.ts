/**
 * A schedule that recurs until the effectful condition f fails, collecting
 * all inputs into a list.
 *
 * @tsplus static ets/Schedule/Ops collectUntilEffect
 */
export function collectUntilEffect<Env, A>(
  f: (a: A) => RIO<Env, boolean>
): Schedule<Tuple<[void, Chunk<A>]>, Env, A, Chunk<A>> {
  return Schedule.recurUntilEffect(f).collectAll();
}
