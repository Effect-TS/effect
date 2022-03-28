import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import type { XHub } from "../../../io/Hub"
import { Stream } from "../definition"

/**
 * Creates a stream from a subscription to a `Hub`.
 *
 * @tsplus static ets/StreamOps fromChunkHub
 */
export function fromChunkHub<R, E, A>(
  hub: LazyArg<XHub<never, R, unknown, E, never, Chunk<A>>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.managed(hub().subscribe()).flatMap((queue) =>
    Stream.fromChunkQueue(queue)
  )
}
