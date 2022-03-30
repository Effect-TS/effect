import type { Tuple } from "../../../collection/immutable/Tuple"
import { Effect } from "../../../io/Effect"
import type { Promise } from "../../../io/Promise"
import { Queue } from "../../../io/Queue"
import type { Take } from "../../Take"
import { Stream } from "../definition"
import { bufferSignal } from "./_internal/bufferSignal"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

/**
 * Allows a faster producer to progress independently of a slower consumer by
 * buffering up to `capacity` elements in a dropping queue.
 *
 * This combinator destroys the chunking structure. It's recommended to use
 * rechunk afterwards.
 *
 * Note: prefer capacities that are powers of 2 for better performance.
 *
 * @tsplus fluent ets/Stream bufferDropping
 */
export function bufferDropping_<R, E, A>(
  self: Stream<R, E, A>,
  capacity: number,
  __tsplusTrace?: string
): Stream<R, E, A> {
  const queue = Effect.acquireRelease(
    Queue.dropping<Tuple<[Take<E, A>, Promise<never, void>]>>(capacity),
    (queue) => queue.shutdown
  )
  const stream = self.via(Stream.rechunk(1))
  concreteStream(stream)
  return new StreamInternal(bufferSignal(queue, stream.channel))
}

/**
 * Allows a faster producer to progress independently of a slower consumer by
 * buffering up to `capacity` elements in a dropping queue.
 *
 * This combinator destroys the chunking structure. It's recommended to use
 * rechunk afterwards.
 *
 * Note: prefer capacities that are powers of 2 for better performance.
 */
export const bufferDropping = Pipeable(bufferDropping_)
