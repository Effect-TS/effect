/**
 * Returns a combined string resulting from concatenating each of the values
 * from the stream.
 *
 * @tsplus getter effect/core/stream/Stream mkString
 * @category destructors
 * @since 1.0.0
 */
export function mkString<R, E, A>(
  self: Stream<R, E, A>
): Effect<R, E, string> {
  return self.run(Sink.mkString())
}
