import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import type { XHub } from "../../../io/Hub"
import { Stream } from "../definition"

/**
 * Creates a stream from a subscription to a hub.
 *
 * The hub will be shut down once the stream is closed.
 *
 * @tsplus static ets/StreamOps fromChunkHubWithShutdown
 */
export function fromChunkHubWithShutdown<R, E, A>(
  hub: LazyArg<XHub<never, R, unknown, E, never, Chunk<A>>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.succeed(hub).flatMap((hub) =>
    Stream.fromChunkHub(hub).ensuring(hub.shutdown())
  )
}
