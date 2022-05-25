import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Allows a faster producer to progress independently of a slower consumer by
 * buffering up to `capacity` chunks in a queue.
 *
 * Note: prefer capacities that are powers of 2 for better performance.
 *
 * @tsplus fluent ets/Stream bufferChunks
 */
export function bufferChunks_<R, E, A>(
  self: Stream<R, E, A>,
  capacity: number,
  __tsplusTrace?: string
): Stream<R, E, A> {
  const queue = self.toQueue(capacity)
  return new StreamInternal(
    Channel.unwrapScoped(queue.map((queue) => {
      const process: Channel<
        unknown,
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
          (a) => Channel.write(a) > process
        )
      )
      return process
    }))
  )
}

/**
 * Allows a faster producer to progress independently of a slower consumer by
 * buffering up to `capacity` chunks in a queue.
 *
 * Note: prefer capacities that are powers of 2 for better performance.
 *
 * @tsplus static ets/Stream/Aspects bufferChunks
 */
export const bufferChunks = Pipeable(bufferChunks_)
