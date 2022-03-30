import { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import type { Dequeue, Queue } from "../../../io/Queue"
import { Pull } from "../../Pull"
import { DEFAULT_CHUNK_SIZE, Stream } from "../definition"

/**
 * Creates a stream from a `Queue` of values.
 *
 * @param maxChunkSize
 *   Maximum number of queued elements to put in one chunk in the stream.
 *
 * @tsplus static ets/StreamOps fromQueue
 */
export function fromQueue<A>(
  queue: LazyArg<Dequeue<A>>,
  maxChunkSize = DEFAULT_CHUNK_SIZE,
  __tsplusTrace?: string
): Stream<unknown, never, A> {
  return Stream.repeatEffectChunkOption(() => {
    const queue0 = queue()
    return (queue0 as Queue<A>)
      .takeBetween(1, maxChunkSize)
      .map(Chunk.from)
      .catchAllCause((cause) =>
        queue0.isShutdown && cause.isInterrupted() ? Pull.end : Pull.failCause(cause)
      )
  })
}
