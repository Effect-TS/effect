/**
 * Creates an effect from `Effect<R, E, A>` that does not fail, but succeeds
 * with the `Take<E, A>`. Any error returned from the stream when pulling is
 * converted to `Take.halt`. Creates a singleton chunk.
 *
 * @tsplus static effect/core/stream/Take.Ops fromEffect
 * @category conversions
 * @since 1.0.0
 */
export function fromEffect<R, E, A>(effect: Effect<R, E, A>): Effect<R, never, Take<E, A>> {
  return effect.foldCause((cause) => Take.failCause(cause), Take.single)
}
