import { Effect } from "../../../../io/Effect"
import type { Chunk } from "../definition"

/**
 * Effectfully maps the elements of this chunk in parallel.
 *
 * @tsplus fluent ets/Chunk mapEffectPar
 */
export function mapEffectPar_<A, R, E, B>(
  self: Chunk<A>,
  f: (a: A) => Effect<R, E, B>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.forEachPar(self, f)
}

/**
 * Effectfully maps the elements of this chunk in parallel.
 *
 * @ets_data_first mapEffectPar_
 */
export function mapEffectPar<A, R, E, B>(
  f: (a: A) => Effect<R, E, B>,
  __tsplusTrace?: string
) {
  return (self: Chunk<A>): Effect<R, E, Chunk<B>> => self.mapEffectPar(f)
}
