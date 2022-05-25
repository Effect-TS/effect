/**
 * Runs the stream only for its effects. The emitted elements are discarded.
 *
 * @tsplus fluent ets/Stream runDrain
 */
export function runDrain<R, E, A>(
  self: Stream<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, void> {
  return self.run(Sink.drain())
}
