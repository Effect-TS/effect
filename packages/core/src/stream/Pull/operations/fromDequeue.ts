import type { Chunk } from "@fp-ts/data/Chunk"
import type { Option } from "@fp-ts/data/Option"

/**
 * @tsplus static effect/core/stream/Pull.Ops fromDequeue
 * @category constructors
 * @since 1.0.0
 */
export function fromDequeue<E, A>(queue: Dequeue<Take<E, A>>): Effect<never, Option<E>, Chunk<A>> {
  return queue.take.flatMap((take) => take.done)
}
