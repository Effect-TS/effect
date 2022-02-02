import { Chunk } from "../../../../collection/immutable/Chunk"
import type { MutableQueue } from "../../../../support/MutableQueue"

/**
 * Poll all items from the queue.
 */
export function unsafePollAll<A>(queue: MutableQueue<A>): Chunk<A> {
  let as = Chunk.empty<A>()
  while (!queue.isEmpty) {
    as = as.append(queue.poll(undefined)!)
  }
  return as
}
