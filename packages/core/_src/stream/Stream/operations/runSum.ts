/**
 * Runs the stream to a sink which sums elements, provided they are numbers.
 *
 * @tsplus getter effect/core/stream/Stream runSum
 */
export function runSum<R, E, A>(
  self: Stream<R, E, number>,
  __tsplusTrace?: string
): Effect<R, E, number> {
  return self.run(Sink.sum())
}
