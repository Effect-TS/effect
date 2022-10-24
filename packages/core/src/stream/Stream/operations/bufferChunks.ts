import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Allows a faster producer to progress independently of a slower consumer by
 * buffering up to `capacity` chunks in a queue.
 *
 * Note: prefer capacities that are powers of 2 for better performance.
 *
 * @tsplus static effect/core/stream/Stream.Aspects bufferChunks
 * @tsplus pipeable effect/core/stream/Stream bufferChunks
 * @category buffering
 * @since 1.0.0
 */
export function bufferChunks(capacity: number) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, A> => {
    const queue = self.toQueue(capacity)
    return new StreamInternal(
      Channel.unwrapScoped(queue.map((queue) => {
        const process: Channel<
          never,
          unknown,
          unknown,
          unknown,
          E,
          Chunk<A>,
          void
        > = Channel.fromEffect(queue.take).flatMap((take) =>
          take.fold(
            Channel.unit,
            (cause) => Channel.failCause(cause),
            (a) => Channel.write(a).flatMap(() => process)
          )
        )
        return process
      }))
    )
  }
}
