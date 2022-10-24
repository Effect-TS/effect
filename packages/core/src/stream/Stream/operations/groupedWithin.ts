import type { Chunk } from "@fp-ts/data/Chunk"
import type { Duration } from "@fp-ts/data/Duration"

/**
 * Partitions the stream with the specified chunkSize or until the specified
 * duration has passed, whichever is satisfied first.
 *
 * @tsplus static effect/core/stream/Stream.Aspects groupedWithin
 * @tsplus pipeable effect/core/stream/Stream groupedWithin
 * @category grouping
 * @since 1.0.0
 */
export function groupedWithin(chunkSize: number, within: Duration) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, Chunk<A>> =>
    self.aggregateWithin(
      Sink.collectAllN<A>(chunkSize),
      Schedule.spaced(within)
    )
}
