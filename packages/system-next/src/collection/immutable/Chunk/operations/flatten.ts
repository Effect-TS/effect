import { identity } from "../../../../data/Function"
import type { Chunk } from "../definition"

/**
 * Flattens a chunk of chunks into a single chunk by concatenating all chunks.
 *
 * @tsplus fluent ets/Chunk flatten
 */
export function flatten<A>(self: Chunk<Chunk<A>>): Chunk<A> {
  return self.flatMap(identity)
}
