/**
 * A schedule that recurs as long as the effectful condition holds, collecting
 * all inputs into a list.
 *
 * @tsplus static ets/Schedule/Ops collectWhileEffect
 */
export function collectWhileEffect<Env, A>(
  f: (a: A) => Effect.RIO<Env, boolean>
): Schedule<Tuple<[void, Chunk<A>]>, Env, A, Chunk<A>> {
  return Schedule.recurWhileEffect(f).collectAll();
}
