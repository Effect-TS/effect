import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import type { Hub } from "../../../io/Hub"
import { Stream } from "../definition"

/**
 * Creates a stream from a subscription to a `Hub`.
 *
 * @tsplus static ets/StreamOps fromChunkHub
 */
export function fromChunkHub<A>(
  hub: LazyArg<Hub<Chunk<A>>>,
  __tsplusTrace?: string
): Stream<unknown, never, A> {
  return Stream.scoped(hub().subscribe).flatMap((queue) => Stream.fromChunkQueue(queue))
}
