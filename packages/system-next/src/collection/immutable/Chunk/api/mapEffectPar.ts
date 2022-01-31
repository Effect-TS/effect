import { Effect } from "../../../../io/Effect/definition"
import type * as Chunk from "../core"

/**
 * Effectfully maps the elements of this chunk in parallel.
 */
export function mapEffectPar_<A, R, E, B>(
  self: Chunk.Chunk<A>,
  f: (a: A) => Effect<R, E, B>,
  __etsTrace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  return Effect.forEachPar(self, f)
}

/**
 * Effectfully maps the elements of this chunk in parallel.
 *
 * @ets_data_first mapEffectPar_
 */
export function mapEffectPar<A, R, E, B>(
  f: (a: A) => Effect<R, E, B>,
  __etsTrace?: string
): (self: Chunk.Chunk<A>) => Effect<R, E, Chunk.Chunk<B>> {
  return (self) => mapEffectPar_(self, f)
}
