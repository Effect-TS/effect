import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal";

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
  const queue = self.toQueueUnbounded();
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
      > = Channel.fromEffect(queue.take).flatMap((take) =>
        take.fold(
          Channel.unit,
          (cause) => Channel.failCause(cause),
          (a) => Channel.write(a) > process
        )
      );
      return process;
    })
  );
}

/**
 * Allows a faster producer to progress independently of a slower consumer by
 * buffering chunks into an unbounded queue.
 *
 * @tsplus static ets/Stream/Aspects bufferUnbounded
 */
export const bufferUnbounded = Pipeable(bufferUnbounded_);
