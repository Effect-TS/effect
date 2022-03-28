import type { Chunk } from "../../../collection/immutable/Chunk"
import { Channel } from "../../Channel"
import type { Stream } from "../../Stream"
import { StreamInternal } from "./_internal/StreamInternal"

/**
 * Allows a faster producer to progress independently of a slower consumer by
 * buffering chunks into an unbounded queue.
 *
 * @tsplus fluent ets/Stream bufferUnbounded
 */
export function bufferUnbounded_<R, E, A>(
  self: Stream<R, E, A>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  const queue = self.toQueueUnbounded()
  return new StreamInternal(
    Channel.managed(queue, (queue) => {
      const process: Channel<
        unknown,
        unknown,
        unknown,
        unknown,
        E,
        Chunk<A>,
        void
      > = Channel.fromEffect(queue.take()).flatMap((take) =>
        take.fold(
          Channel.unit,
          (cause) => Channel.failCause(cause),
          (a) => Channel.write(a) > process
        )
      )
      return process
    })
  )
}

/**
 * Allows a faster producer to progress independently of a slower consumer by
 * buffering chunks into an unbounded queue.
 */
export const bufferUnbounded = Pipeable(bufferUnbounded_)
