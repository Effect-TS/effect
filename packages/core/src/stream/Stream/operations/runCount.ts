/**
 * Runs the stream and emits the number of elements processed.
 *
 * @tsplus getter effect/core/stream/Stream runCount
 * @tsplus static effect/core/stream/Stream.Aspects runCount
 * @category destructors
 * @since 1.0.0
 */
export function runCount<R, E, A>(
  self: Stream<R, E, A>
): Effect<R, E, number> {
  return self.run(Sink.count())
}
