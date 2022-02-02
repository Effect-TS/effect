import { Effect } from "../../../../io/Effect"
import type { Chunk } from "../definition"

/**
 * Effectfully maps the elements of this chunk in parallel purely for the
 * effects.
 *
 * @tsplus fluent ets/Chunk mapEffectParDiscard
 */
export function mapEffectParDiscard_<A, R, E, B>(
  self: Chunk<A>,
  n: number,
  f: (a: A) => Effect<R, E, B>,
  __etsTrace?: string
): Effect<R, E, void> {
  return Effect.forEachParDiscard(self, f).withParallelism(n)
}

/**
 * Effectfully maps the elements of this chunk in parallel purely for the effects.
 *
 * @ets_data_first mapEffectParDiscard_
 */
export function mapEffectParDiscard<A, R, E, B>(
  n: number,
  f: (a: A) => Effect<R, E, B>,
  __etsTrace?: string
) {
  return (self: Chunk<A>): Effect<R, E, void> => self.mapEffectParDiscard(n, f)
}
