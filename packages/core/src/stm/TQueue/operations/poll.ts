import * as Chunk from "@fp-ts/data/Chunk"
import type { Option } from "@fp-ts/data/Option"

/**
 * Takes a single element from the queue, returning `None` if the queue is
 * empty.
 *
 * @tsplus getter effect/core/stm/TQueue poll
 * @category mutations
 * @since 1.0.0
 */
export function poll<A>(self: TQueue<A>): USTM<Option<A>> {
  return self.takeUpTo(1).map(Chunk.head)
}
