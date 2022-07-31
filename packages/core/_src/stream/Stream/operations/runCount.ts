/**
 * Runs the stream and emits the number of elements processed.
 *
 * @tsplus getter effect/core/stream/Stream runCount
 */
export function runCount<R, E, A>(
  self: Stream<R, E, A>
): Effect<R, E, number> {
  return self.run(Sink.count())
}
