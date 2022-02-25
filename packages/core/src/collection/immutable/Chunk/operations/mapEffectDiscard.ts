import { Effect } from "../../../../io/Effect"
import type { Chunk } from "../definition"

/**
 * Effectfully maps the elements of this chunk purely for the effects.
 *
 * @tsplus fluent ets/Chunk mapEffectDiscard
 */
export function mapEffectDiscard_<A, R, E, B>(
  self: Chunk<A>,
  f: (a: A) => Effect<R, E, B>,
  __tsplusTrace?: string
): Effect<R, E, void> {
  return Effect.forEachDiscard(self, f)
}

/**
 * Effectfully maps the elements of this chunk purely for the effects.
 *
 * @ets_data_first mapEffectDiscard_
 */
export function mapEffectDiscard<A, R, E, B>(
  f: (a: A) => Effect<R, E, B>,
  __tsplusTrace?: string
) {
  return (self: Chunk<A>): Effect<R, E, void> => self.mapEffectDiscard(f)
}
