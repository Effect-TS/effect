import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Concatenates two chunks.
 *
 * @tsplus operator ets/Chunk +
 * @tsplus fluent ets/Chunk concat
 */
export function concat_<A, A1>(self: Chunk<A>, that: Chunk<A1>): Chunk<A | A1> {
  return concreteId(self)._concat(concreteId(that))
}

/**
 * Concats chunks
 *
 * @ets_data_first concat_
 */
export function concat<A1>(that: Chunk<A1>) {
  return <A>(self: Chunk<A>): Chunk<A | A1> => self + that
}
