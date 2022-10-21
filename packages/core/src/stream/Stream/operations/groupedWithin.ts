/**
 * Partitions the stream with the specified chunkSize or until the specified
 * duration has passed, whichever is satisfied first.
 *
 * @tsplus static effect/core/stream/Stream.Aspects groupedWithin
 * @tsplus pipeable effect/core/stream/Stream groupedWithin
 */
export function groupedWithin(chunkSize: number, within: Duration) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, Chunk<A>> =>
    self.aggregateWithin(
      Sink.collectAllN<A>(chunkSize),
      Schedule.spaced(within)
    )
}
