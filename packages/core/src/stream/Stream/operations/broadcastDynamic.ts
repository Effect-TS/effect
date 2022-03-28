import type { Managed } from "../../../io/Managed"
import { Stream } from "../definition"

/**
 * Fan out the stream, producing a dynamic number of streams that have the
 * same elements as this stream. The driver stream will only ever advance the
 * `maximumLag` chunks before the slowest downstream stream.
 *
 * @tsplus fluent ets/Stream broadcastDynamic
 */
export function broadcastDynamic_<R, E, A>(
  self: Stream<R, E, A>,
  maximumLag: number,
  __tsplusTrace?: string
): Managed<R, never, Stream<unknown, E, A>> {
  return self.broadcastedQueuesDynamic(maximumLag).map((managed) =>
    Stream.managed(managed)
      .flatMap((queue) => Stream.fromQueue(queue))
      .flattenTake()
  )
}

/**
 * Fan out the stream, producing a dynamic number of streams that have the
 * same elements as this stream. The driver stream will only ever advance the
 * `maximumLag` chunks before the slowest downstream stream.
 */
export const broadcastDynamic = Pipeable(broadcastDynamic_)
