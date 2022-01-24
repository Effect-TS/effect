import type { Effect } from "../../../../io/Effect/definition"
import { forEachPar_ } from "../../../../io/Effect/operations/excl-forEach"
import type * as Chunk from "../core"

/**
 * Effectfully maps the elements of this chunk in parallel.
 */
export function mapEffectPar_<A, R, E, B>(
  self: Chunk.Chunk<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, Chunk.Chunk<B>> {
  return forEachPar_(self, f)
}

/**
 * Effectfully maps the elements of this chunk in parallel.
 *
 * @ets_data_first mapEffectPar_
 */
export function mapEffectPar<A, R, E, B>(
  f: (a: A) => Effect<R, E, B>
): (self: Chunk.Chunk<A>) => Effect<R, E, Chunk.Chunk<B>> {
  return (self) => mapEffectPar_(self, f)
}
