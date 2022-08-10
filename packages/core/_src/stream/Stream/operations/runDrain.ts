/**
 * Runs the stream only for its effects. The emitted elements are discarded.
 *
 * @tsplus getter effect/core/stream/Stream runDrain
 */
export function runDrain<R, E, A>(
  self: Stream<R, E, A>
): Effect<R, E, void> {
  return self.run(Sink.drain())
}
