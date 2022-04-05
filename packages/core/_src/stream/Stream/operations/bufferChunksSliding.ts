import { bufferSignal } from "@effect-ts/core/stream/Stream/operations/_internal/bufferSignal";
import { concreteStream, StreamInternal } from "@effect-ts/core/stream/Stream/operations/_internal/StreamInternal";

/**
 * Allows a faster producer to progress independently of a slower consumer by
 * buffering up to `capacity` chunks in a sliding queue.
 *
 * Note: prefer capacities that are powers of 2 for better performance.
 *
 * @tsplus fluent ets/Stream bufferChunksSliding
 */
export function bufferChunksSliding_<R, E, A>(
  self: Stream<R, E, A>,
  capacity: number,
  __tsplusTrace?: string
): Stream<R, E, A> {
  const queue = Effect.acquireRelease(
    Queue.sliding<Tuple<[Take<E, A>, Deferred<never, void>]>>(capacity),
    (queue) => queue.shutdown
  );
  concreteStream(self);
  return new StreamInternal(bufferSignal(queue, self.channel));
}

/**
 * Allows a faster producer to progress independently of a slower consumer by
 * buffering up to `capacity` chunks in a sliding queue.
 *
 * Note: prefer capacities that are powers of 2 for better performance.
 *
 * @tsplus static ets/Stream/Aspects bufferChunksSliding
 */
export const bufferChunksSliding = Pipeable(bufferChunksSliding_);
