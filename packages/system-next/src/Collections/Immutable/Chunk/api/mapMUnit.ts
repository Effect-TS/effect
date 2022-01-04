import type { Effect } from "../../../../Effect/effect"
import * as forEach from "../../../../Effect/excl-forEach"
import type * as Chunk from "../core"

/**
 * Effectfully maps the elements of this chunk purely for the effects.
 */
export function mapMUnit_<A, R, E, B>(
  self: Chunk.Chunk<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, void> {
  return forEach.forEachUnit_(self, f)
}

/**
 * Effectfully maps the elements of this chunk purely for the effects.
 *
 * @ets_data_first mapMUnit_
 */
export function mapMUnit<A, R, E, B>(
  f: (a: A) => Effect<R, E, B>
): (self: Chunk.Chunk<A>) => Effect<R, E, void> {
  return (self) => mapMUnit_(self, f)
}
