import { Effect } from "../../../../io/Effect/definition"
import type * as Chunk from "../core"

/**
 * Effectfully maps the elements of this chunk purely for the effects.
 */
export function mapEffectUnit_<A, R, E, B>(
  self: Chunk.Chunk<A>,
  f: (a: A) => Effect<R, E, B>,
  __etsTrace?: string
): Effect<R, E, void> {
  return Effect.forEachDiscard(self, f)
}

/**
 * Effectfully maps the elements of this chunk purely for the effects.
 *
 * @ets_data_first mapEffectUnit_
 */
export function mapEffectUnit<A, R, E, B>(
  f: (a: A) => Effect<R, E, B>,
  __etsTrace?: string
): (self: Chunk.Chunk<A>) => Effect<R, E, void> {
  return (self) => mapEffectUnit_(self, f)
}
