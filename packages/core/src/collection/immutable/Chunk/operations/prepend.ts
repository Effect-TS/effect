import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Prepends a value to a chunk.
 *
 * @tsplus fluent ets/Chunk prepend
 */
export function prepend_<A, A1>(self: Chunk<A>, a: A1): Chunk<A | A1> {
  return concreteId(self)._prepend(a)
}

/**
 * Prepends a value to a chunk.
 *
 * @ets_data_first prepend_
 */
export function prepend<A1>(a: A1) {
  return <A>(self: Chunk<A>): Chunk<A | A1> => self.prepend(a)
}
