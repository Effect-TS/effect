import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import type { Hub } from "../../../io/Hub"
import type { HasScope } from "../../../io/Scope"
import { DEFAULT_CHUNK_SIZE, Stream } from "../definition"

/**
 * Creates a stream from a subscription to a hub in the context of a scoped
 * effect. The scoped effect describes subscribing to receive messages from
 * the hub while the stream describes taking messages from the hub.
 *
 * @param maxChunkSize
 *   Maximum number of queued elements to put in one chunk in the stream.
 *
 * @tsplus static ets/StreamOps fromHubScoped
 */
export function fromHubScoped<A>(
  hub: LazyArg<Hub<A>>,
  maxChunkSize = DEFAULT_CHUNK_SIZE,
  __tsplusTrace?: string
): Effect<HasScope, never, Stream<unknown, never, A>> {
  return Effect.suspendSucceed(
    hub().subscribe.map((queue) => Stream.fromQueueWithShutdown(queue, maxChunkSize))
  )
}
