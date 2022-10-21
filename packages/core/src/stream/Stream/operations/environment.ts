/**
 * Accesses the whole environment of the stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops environment
 */
export function environment<R>(): Stream<R, never, Env<R>> {
  return Stream.fromEffect(Effect.environment<R>())
}
