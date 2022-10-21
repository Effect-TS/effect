/**
 * Runs the stream to completion and yields the last value emitted by it,
 * discarding the rest of the elements.
 *
 * @tsplus getter effect/core/stream/Stream runLast
 */
export function runLast<R, E, A>(
  self: Stream<R, E, A>
): Effect<R, E, Maybe<A>> {
  return self.run(Sink.last())
}
