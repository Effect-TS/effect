import type { Effect } from "../../../../Effect/effect"
import * as forEach from "../../../../Effect/excl-forEach"
import type * as Chunk from "../core"

/**
 * Effectfully maps the elements of this chunk in parallel purely for the effects.
 */
export function mapEffectUnitParN_<A, R, E, B>(
  self: Chunk.Chunk<A>,
  n: number,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, void> {
  return forEach.forEachUnitParN_(self, n, f)
}

/**
 * Effectfully maps the elements of this chunk in parallel purely for the effects.
 *
 * @ets_data_first mapEffectUnitParN_
 */
export function mapEffectUnitParN<A, R, E, B>(
  n: number,
  f: (a: A) => Effect<R, E, B>
): (self: Chunk.Chunk<A>) => Effect<R, E, void> {
  return (self) => mapEffectUnitParN_(self, n, f)
}
