import type { LazyArg } from "../../../data/Function"
import type { Hub } from "../../../io/Hub"
import { DEFAULT_CHUNK_SIZE, Stream } from "../definition"

/**
 * Creates a stream from a subscription to a hub.
 *
 * @param maxChunkSize
 *   Maximum number of queued elements to put in one chunk in the stream.
 *
 * @tsplus static ets/StreamOps fromHub
 */
export function fromHub<A>(
  hub: LazyArg<Hub<A>>,
  maxChunkSize = DEFAULT_CHUNK_SIZE,
  __tsplusTrace?: string
): Stream<unknown, never, A> {
  return Stream.scoped(hub().subscribe).flatMap((queue) =>
    Stream.fromQueue(queue, maxChunkSize)
  )
}
