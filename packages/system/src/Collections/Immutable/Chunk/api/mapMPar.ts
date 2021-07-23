import type { Effect } from "../../../../Effect/effect"
import * as forEach from "../../../../Effect/excl-forEach"
import type * as Chunk from "../core"

/**
 * Effectfully maps the elements of this chunk in parallel.
 */
export function mapMPar_<A, R, E, B>(
  self: Chunk.Chunk<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, Chunk.Chunk<B>> {
  return forEach.forEachPar_(self, f)
}

/**
 * Effectfully maps the elements of this chunk in parallel.
 *
 * @ets_data_first mapMPar_
 */
export function mapMPar<A, R, E, B>(
  f: (a: A) => Effect<R, E, B>
): (self: Chunk.Chunk<A>) => Effect<R, E, Chunk.Chunk<B>> {
  return (self) => mapMPar_(self, f)
}
