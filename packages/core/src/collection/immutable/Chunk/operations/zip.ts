import { Tuple } from "../../Tuple"
import type { Chunk } from "../definition"

/**
 * Zips this chunk with the specified chunk using the specified combiner.
 *
 * @tsplus fluent ets/Chunk zip
 */
export function zip_<A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<Tuple<[A, B]>> {
  return self.zipWith(that, (a, b) => Tuple(a, b))
}

/**
 * Zips this chunk with the specified chunk using the specified combiner.
 *
 * @ets_data_first zip_
 */
export function zip<B>(that: Chunk<B>): <A>(self: Chunk<A>) => Chunk<Tuple<[A, B]>> {
  return (self) => self.zip(that)
}
