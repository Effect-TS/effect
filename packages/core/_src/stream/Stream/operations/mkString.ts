/**
 * Returns a combined string resulting from concatenating each of the values
 * from the stream.
 *
 * @tsplus getter effect/core/stream/Stream mkString
 */
export function mkString<R, E, A>(
  self: Stream<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, string> {
  return self.run(Sink.mkString())
}
