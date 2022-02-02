import type { Effect } from "../../../../Effect/effect"
import * as forEach from "../../../../Effect/excl-forEach"
import type * as Chunk from "../core"

/**
 * Effectfully maps the elements of this chunk purely for the effects.
 */
export function mapEffectUnit_<A, R, E, B>(
  self: Chunk.Chunk<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, void> {
  return forEach.forEachUnit_(self, f)
}

/**
 * Effectfully maps the elements of this chunk purely for the effects.
 *
 * @ets_data_first mapEffectUnit_
 */
export function mapEffectUnit<A, R, E, B>(
  f: (a: A) => Effect<R, E, B>
): (self: Chunk.Chunk<A>) => Effect<R, E, void> {
  return (self) => mapEffectUnit_(self, f)
}
