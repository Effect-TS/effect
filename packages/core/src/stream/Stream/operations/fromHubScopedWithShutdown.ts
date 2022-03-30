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
 * The hub will be shut down once the stream is closed.
 *
 * @param maxChunkSize
 *   Maximum number of queued elements to put in one chunk in the stream.
 *
 * @tsplus static ets/StreamOps fromHubScopedWithShutdown
 */
export function fromHubScopedWithShutdown<A>(
  hub: LazyArg<Hub<A>>,
  maxChunkSize = DEFAULT_CHUNK_SIZE,
  __tsplusTrace?: string
): Effect<HasScope, never, Stream<unknown, never, A>> {
  return Effect.succeed(hub).flatMap((hub) =>
    Stream.fromHubScoped(hub, maxChunkSize).map((stream) =>
      stream.ensuring(hub.shutdown)
    )
  )
}
