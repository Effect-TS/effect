import { bufferSignal } from "@effect/core/stream/Stream/operations/_internal/bufferSignal"
import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Allows a faster producer to progress independently of a slower consumer by
 * buffering up to `capacity` elements in a dropping queue.
 *
 * This combinator destroys the chunking structure. It's recommended to use
 * rechunk afterwards.
 *
 * Note: prefer capacities that are powers of 2 for better performance.
 *
 * @tsplus static effect/core/stream/Stream.Aspects bufferDropping
 * @tsplus pipeable effect/core/stream/Stream bufferDropping
 */
export function bufferDropping(capacity: number) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, A> => {
    const queue = Effect.acquireRelease(
      Queue.dropping<Tuple<[Take<E, A>, Deferred<never, void>]>>(capacity),
      (queue) => queue.shutdown
    )
    const stream = self.via(Stream.$.rechunk(1))
    concreteStream(stream)
    return new StreamInternal(bufferSignal(queue, stream.channel))
  }
}
