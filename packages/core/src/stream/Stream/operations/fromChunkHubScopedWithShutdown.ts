import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import type { Hub } from "../../../io/Hub"
import type { HasScope } from "../../../io/Scope"
import { Stream } from "../definition"

/**
 * Creates a stream from a subscription to a hub in the context of a scoped
 * effect. The scoped effect describes subscribing to receive messages from
 * the hub while the stream describes taking messages from the hub.
 *
 * The hub will be shut down once the stream is closed.
 *
 * @tsplus static ets/StreamOps fromChunkHubScopedWithShutdown
 */
export function fromChunkHubScopedWithShutdown<A>(
  hub: LazyArg<Hub<Chunk<A>>>,
  __tsplusTrace?: string
): Effect<HasScope, never, Stream<unknown, never, A>> {
  return Effect.succeed(hub).flatMap((hub) =>
    Stream.fromChunkHubScoped(hub).ensuring(hub.shutdown)
  )
}
