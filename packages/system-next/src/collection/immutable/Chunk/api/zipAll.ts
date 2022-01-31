import { Option } from "../../../../data/Option"
import { Tuple } from "../../Tuple"
import type { Chunk } from "../_definition"
import { zipAllWith_ } from "./zipAllWith"

/**
 * Zips this chunk with the specified chunk to produce a new chunk with
 * pairs of elements from each chunk, filling in missing values from the
 * shorter chunk with `None`. The returned chunk will have the length of the
 * longer chunk.
 */
export function zipAll_<A, B>(
  self: Chunk<A>,
  that: Chunk<B>
): Chunk<Tuple<[Option<A>, Option<B>]>> {
  return zipAllWith_(
    self,
    that,
    (a, b) => Tuple(Option.some(a), Option.some(b)),
    (a) => Tuple(Option.some(a), Option.none),
    (b) => Tuple(Option.none, Option.some(b))
  )
}

/**
 * Zips this chunk with the specified chunk to produce a new chunk with
 * pairs of elements from each chunk, filling in missing values from the
 * shorter chunk with `None`. The returned chunk will have the length of the
 * longer chunk.
 *
 * @ets_data_first zipAll_
 */
export function zipAll<A, B>(
  that: Chunk<B>
): (self: Chunk<A>) => Chunk<Tuple<[Option<A>, Option<B>]>> {
  return (self) => zipAll_(self, that)
}
