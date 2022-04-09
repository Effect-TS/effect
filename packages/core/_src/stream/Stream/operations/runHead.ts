/**
 * Runs the stream to completion and yields the first value emitted by it,
 * discarding the rest of the elements.
 *
 * @tsplus fluent ets/Stream runHead
 */
export function runHead<R, E, A>(
  self: Stream<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, Option<A>> {
  return self.run(Sink.head());
}
