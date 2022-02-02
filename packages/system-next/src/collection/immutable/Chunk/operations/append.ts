import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Appends a value to a chunk.
 *
 * @tsplus fluent ets/Chunk append
 */
export function append_<A, A1>(self: Chunk<A>, a: A1): Chunk<A | A1> {
  return concreteId(self)._append(a)
}

/**
 * Appends a value to a chunk.
 *
 * @ets_data_first append_
 */
export function append<A1>(a: A1) {
  return <A>(self: Chunk<A>): Chunk<A | A1> => self.append(a)
}
