// ets_tracing: off

import * as Tp from "../../Tuple/index.js"
import type { Chunk } from "../definition.js"
import { zipWith_ } from "./zipWith.js"

/**
 * Zips this chunk with the specified chunk using the specified combiner.
 */
export function zip_<A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<Tp.Tuple<[A, B]>> {
  return zipWith_(self, that, Tp.tuple)
}

/**
 * Zips this chunk with the specified chunk using the specified combiner.
 *
 * @ets_data_first zip_
 */
export function zip<B>(that: Chunk<B>): <A>(self: Chunk<A>) => Chunk<Tp.Tuple<[A, B]>> {
  return (self) => zip_(self, that)
}
