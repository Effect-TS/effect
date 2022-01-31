import { Effect } from "../../../../io/Effect/definition"
import type * as Chunk from "../core"

/**
 * Effectfully maps the elements of this chunk.
 */
export function mapEffect_<A, R, E, B>(
  self: Chunk.Chunk<A>,
  f: (a: A) => Effect<R, E, B>,
  __etsTrace?: string
): Effect<R, E, Chunk.Chunk<B>> {
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
): (self: Chunk.Chunk<A>) => Effect<R, E, Chunk.Chunk<B>> {
  return (self) => mapEffect_(self, f)
}
