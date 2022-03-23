import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Duration } from "../../../data/Duration"
import type { LazyArg } from "../../../data/Function"
import type { HasClock } from "../../../io/Clock"
import { Schedule } from "../../../io/Schedule"
import { Sink } from "../../Sink"
import type { Stream } from "../../Stream"

/**
 * Partitions the stream with the specified chunkSize or until the specified
 * duration has passed, whichever is satisfied first.
 *
 * @tsplus fluent ets/Stream groupedWithin
 */
export function groupedWithin_<R, E, A>(
  self: Stream<R, E, A>,
  chunkSize: number,
  within: LazyArg<Duration>,
  __tsplusTrace?: string
): Stream<R & HasClock, E, Chunk<A>> {
  return self.aggregateAsyncWithin(
    Sink.collectAllN<A>(chunkSize),
    Schedule.spaced(within())
  )
}

/**
 * Partitions the stream with the specified chunkSize or until the specified
 * duration has passed, whichever is satisfied first.
 */
export const groupedWithin = Pipeable(groupedWithin_)
