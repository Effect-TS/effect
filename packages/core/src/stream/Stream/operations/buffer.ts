import { Chunk } from "../../../collection/immutable/Chunk"
import { Cause } from "../../../io/Cause"
import { Channel } from "../../Channel"
import type { Stream } from "../definition"
import { StreamInternal } from "./_internal/StreamInternal"

/**
 * Allows a faster producer to progress independently of a slower consumer by
 * buffering up to `capacity` elements in a queue.
 *
 * This combinator destroys the chunking structure. It's recommended to use
 * rechunk afterwards.
 *
 * Note: prefer capacities that are powers of 2 for better performance.
 *
 * @tsplus fluent ets/Stream buffer
 */
export function buffer_<R, E, A>(
  self: Stream<R, E, A>,
  capacity: number,
  __tsplusTrace?: string
): Stream<R, E, A> {
  const queue = self.toQueueOfElements(capacity)
  return new StreamInternal(
    Channel.scoped(queue, (queue) => {
      const process: Channel<
        unknown,
        unknown,
        unknown,
        unknown,
        E,
        Chunk<A>,
        void
      > = Channel.fromEffect(queue.take).flatMap((exit) =>
        exit.fold(
          (cause) =>
            Cause.flipCauseOption(cause).fold(Channel.unit, (cause) =>
              Channel.failCause(cause)
            ),
          (a) => Channel.write(Chunk.single(a)) > process
        )
      )
      return process
    })
  )
}

/**
 * Allows a faster producer to progress independently of a slower consumer by
 * buffering up to `capacity` elements in a queue.
 *
 * This combinator destroys the chunking structure. It's recommended to use
 * rechunk afterwards.
 *
 * Note: prefer capacities that are powers of 2 for better performance.
 */
export const buffer = Pipeable(buffer_)
