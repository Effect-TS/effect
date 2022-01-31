// ets_tracing: off

import type { Effect } from "../../../../Effect/effect.js"
import * as forEach from "../../../../Effect/excl-forEach.js"
import type * as Chunk from "../core.js"

/**
 * Effectfully maps the elements of this chunk in parallel purely for the effects.
 */
export function mapEffectUnitPar_<A, R, E, B>(
  self: Chunk.Chunk<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, void> {
  return forEach.forEachUnitPar_(self, f)
}

/**
 * Effectfully maps the elements of this chunk in parallel purely for the effects.
 *
 * @ets_data_first mapEffectUnitPar_
 */
export function mapEffectUnitPar<A, R, E, B>(
  f: (a: A) => Effect<R, E, B>
): (self: Chunk.Chunk<A>) => Effect<R, E, void> {
  return (self) => mapEffectUnitPar_(self, f)
}
