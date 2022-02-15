import { Effect } from "../../../../io/Effect"
import type { Chunk } from "../definition"

/**
 * Effectfully maps the elements of this chunk.
 *
 * @tsplus fluent ets/Chunk mapEffect
 */
export function mapEffect_<A, R, E, B>(
  self: Chunk<A>,
  f: (a: A) => Effect<R, E, B>,
  __etsTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.forEach(self, f)
}

/**
 * Effectfully maps the elements of this chunk.
 *
 * @ets_data_first mapEffect_
 */
export function mapEffect<A, R, E, B>(
  f: (a: A) => Effect<R, E, B>,
  __etsTrace?: string
) {
  return (self: Chunk<A>): Effect<R, E, Chunk<B>> => self.mapEffect(f)
}
