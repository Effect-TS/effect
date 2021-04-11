import type { Effect } from "../../../../Effect/effect"
import * as forEach from "../../../../Effect/excl-forEach"
import * as coreMap from "../../../../Effect/map"
import * as Chunk from "../core"

/**
 * Effectfully maps the elements of this chunk in parallel.
 */
export function mapMParN_<A, R, E, B>(
  self: Chunk.Chunk<A>,
  n: number,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, Chunk.Chunk<B>> {
  return coreMap.map_(forEach.forEachParN_(self, n, f), Chunk.from)
}

/**
 * Effectfully maps the elements of this chunk in parallel.
 *
 * @dataFirst mapMParM_
 */
export function mapMParN<A, R, E, B>(
  n: number,
  f: (a: A) => Effect<R, E, B>
): (self: Chunk.Chunk<A>) => Effect<R, E, Chunk.Chunk<B>> {
  return (self) => mapMParN_(self, n, f)
}
