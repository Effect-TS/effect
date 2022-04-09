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
    .map((chunk) => chunk.map((queue) => Stream.fromQueueWithShutdown(queue).flattenTake()));
}

/**
 * Fan out the stream, producing a list of streams that have the same elements
 * as this stream. The driver stream will only ever advance the `maximumLag`
 * chunks before the slowest downstream stream.
 *
 * @tsplus static ets/Stream/Aspects broadcast
 */
export const broadcast = Pipeable(broadcast_);
