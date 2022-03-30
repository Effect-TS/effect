import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import type { Hub } from "../../../io/Hub"
import { Stream } from "../definition"

/**
 * Creates a stream from a subscription to a hub.
 *
 * The hub will be shut down once the stream is closed.
 *
 * @tsplus static ets/StreamOps fromChunkHubWithShutdown
 */
export function fromChunkHubWithShutdown<A>(
  hub: LazyArg<Hub<Chunk<A>>>,
  __tsplusTrace?: string
): Stream<unknown, never, A> {
  return Stream.succeed(hub).flatMap((hub) =>
    Stream.fromChunkHub(hub).ensuring(hub.shutdown)
  )
}
