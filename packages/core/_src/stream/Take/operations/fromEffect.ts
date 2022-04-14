/**
 * Creates an effect from `Effect<R, E, A>` that does not fail, but succeeds
 * with the `Take<E, A>`. Any error returned from the stream when pulling is
 * converted to `Take.halt`. Creates a singleton chunk.
 *
 * @tsplus static ets/Take/Ops fromEffect
 */
export function fromEffect<R, E, A>(effect: Effect<R, E, A>): Effect.RIO<R, Take<E, A>> {
  return effect.foldCause((cause) => Take.failCause(cause), Take.single);
}
