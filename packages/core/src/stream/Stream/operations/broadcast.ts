import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Effect } from "../../../io/Effect"
import type { HasScope } from "../../../io/Scope"
import { Stream } from "../definition"

/**
 * Fan out the stream, producing a list of streams that have the same elements
 * as this stream. The driver stream will only ever advance the `maximumLag`
 * chunks before the slowest downstream stream.
 *
 * @tsplus fluent ets/Stream broadcast
 */
export function broadcast_<R, E, A>(
  self: Stream<R, E, A>,
  n: number,
  maximumLag: number,
  __tsplusTrace?: string
): Effect<R & HasScope, never, Chunk<Stream<unknown, E, A>>> {
  return self
    .broadcastedQueues(n, maximumLag)
    .map((chunk) =>
      chunk.map((queue) => Stream.fromQueueWithShutdown(queue).flattenTake())
    )
}

/**
 * Fan out the stream, producing a list of streams that have the same elements
 * as this stream. The driver stream will only ever advance the `maximumLag`
 * chunks before the slowest downstream stream.
 */
export const broadcast = Pipeable(broadcast_)
