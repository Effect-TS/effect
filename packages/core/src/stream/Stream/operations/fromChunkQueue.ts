import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import type { XQueue } from "../../../io/Queue"
import { Pull } from "../../Pull"
import { Stream } from "../definition"

/**
 * Creates a stream from a queue of values.
 *
 * @tsplus static ets/StreamOps fromChunkQueue
 */
export function fromChunkQueue<R, E, A>(
  queue: LazyArg<XQueue<never, R, unknown, E, never, Chunk<A>>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.repeatEffectChunkOption(() => {
    const queue0 = queue()
    return queue0
      .take()
      .catchAllCause((cause) =>
        queue0
          .isShutdown()
          .flatMap((isShutdown) =>
            isShutdown && cause.isInterrupted() ? Pull.end : Pull.failCause(cause)
          )
      )
  })
}
