import * as O from "../../../../Option"
import type { Chunk } from "../definition"
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
): Chunk<readonly [O.Option<A>, O.Option<B>]> {
  return zipAllWith_(
    self,
    that,
    (a, b) => [O.some(a), O.some(b)],
    (a) => [O.some(a), O.none],
    (b) => [O.none, O.some(b)]
  )
}

/**
 * Zips this chunk with the specified chunk to produce a new chunk with
 * pairs of elements from each chunk, filling in missing values from the
 * shorter chunk with `None`. The returned chunk will have the length of the
 * longer chunk.
 *
 * @dataFirst zipAll_
 */
export function zipAll<A, B>(
  that: Chunk<B>
): (self: Chunk<A>) => Chunk<readonly [O.Option<A>, O.Option<B>]> {
  return (self) => zipAll_(self, that)
}
