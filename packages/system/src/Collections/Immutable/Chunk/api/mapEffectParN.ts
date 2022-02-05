// ets_tracing: off

import type { Effect } from "../../../../Effect/effect.js"
import * as forEach from "../../../../Effect/excl-forEach.js"
import type * as Chunk from "../core.js"

/**
 * Effectfully maps the elements of this chunk in parallel.
 */
export function mapMParEffect_<A, R, E, B>(
  self: Chunk.Chunk<A>,
  n: number,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, Chunk.Chunk<B>> {
  return forEach.forEachParN_(self, n, f)
}

/**
 * Effectfully maps the elements of this chunk in parallel.
 *
 * @ets_data_first mapMParEffect_
 */
export function mapMParEffect<A, R, E, B>(
  n: number,
  f: (a: A) => Effect<R, E, B>
): (self: Chunk.Chunk<A>) => Effect<R, E, Chunk.Chunk<B>> {
  return (self) => mapMParEffect_(self, n, f)
}
