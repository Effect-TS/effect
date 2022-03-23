import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import type { XHub } from "../../../io/Hub"
import { Managed } from "../../../io/Managed"
import { Stream } from "../definition"

/**
 * Creates a stream from a subscription to a hub in the context of a managed
 * effect. The managed effect describes subscribing to receive messages from
 * the hub while the stream describes taking messages from the hub.
 *
 * @tsplus static ets/StreamOps fromChunkHubManaged
 */
export function fromChunkHubManaged<R, E, A>(
  hub: LazyArg<XHub<never, R, unknown, E, never, Chunk<A>>>,
  __tsplusTrace?: string
): Managed<unknown, never, Stream<R, E, A>> {
  return Managed.succeed(hub).flatMap((hub) =>
    hub.subscribe().map((queue) => Stream.fromChunkQueue(queue))
  )
}
