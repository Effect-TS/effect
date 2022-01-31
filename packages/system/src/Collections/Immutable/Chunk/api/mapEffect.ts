// ets_tracing: off

import type { Effect } from "../../../../Effect/effect.js"
import * as forEach from "../../../../Effect/excl-forEach.js"
import type * as Chunk from "../core.js"

/**
 * Effectfully maps the elements of this chunk.
 */
export function mapEffect_<A, R, E, B>(
  self: Chunk.Chunk<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, Chunk.Chunk<B>> {
  return forEach.forEach_(self, f)
}

/**
 * Effectfully maps the elements of this chunk.
 *
 * @ets_data_first mapEffect_
 */
export function mapEffect<A, R, E, B>(
  f: (a: A) => Effect<R, E, B>
): (self: Chunk.Chunk<A>) => Effect<R, E, Chunk.Chunk<B>> {
  return (self) => mapEffect_(self, f)
}
