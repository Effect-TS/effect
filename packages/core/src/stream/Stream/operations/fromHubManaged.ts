import type { LazyArg } from "../../../data/Function"
import type { XHub } from "../../../io/Hub"
import { Managed } from "../../../io/Managed"
import { DEFAULT_CHUNK_SIZE, Stream } from "../definition"

/**
 * Creates a stream from a subscription to a hub in the context of a managed
 * effect. The managed effect describes subscribing to receive messages from
 * the hub while the stream describes taking messages from the hub.
 *
 * @param maxChunkSize
 *   Maximum number of queued elements to put in one chunk in the stream.
 *
 * @tsplus static ets/StreamOps fromHubManaged
 */
export function fromHubManaged<R, E, A>(
  hub: LazyArg<XHub<never, R, unknown, E, never, A>>,
  maxChunkSize = DEFAULT_CHUNK_SIZE,
  __tsplusTrace?: string
): Managed<unknown, never, Stream<R, E, A>> {
  return Managed.suspend(
    hub()
      .subscribe()
      .map((queue) => Stream.fromQueueWithShutdown(queue, maxChunkSize))
  )
}
