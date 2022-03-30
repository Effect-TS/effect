import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import type { Dequeue } from "../../../io/Queue"
import { Pull } from "../../Pull"
import { Stream } from "../definition"

/**
 * Creates a stream from a queue of values.
 *
 * @tsplus static ets/StreamOps fromChunkQueue
 */
export function fromChunkQueue<A>(
  queue: LazyArg<Dequeue<Chunk<A>>>,
  __tsplusTrace?: string
): Stream<unknown, never, A> {
  return Stream.repeatEffectChunkOption(() => {
    const queue0 = queue()
    return queue0.take.catchAllCause((cause) =>
      queue0.isShutdown.flatMap((isShutdown) =>
        isShutdown && cause.isInterrupted() ? Pull.end : Pull.failCause(cause)
      )
    )
  })
}
