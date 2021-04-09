import type { Effect } from "../../../Effect/effect"
import * as forEach from "../../../Effect/excl-forEach"
import type * as Chunk from "../core"

/**
 * Effectfully maps the elements of this chunk in parallel purely for the effects.
 */
export function mapMUnitParN_<A, R, E, B>(
  self: Chunk.Chunk<A>,
  n: number,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, void> {
  return forEach.forEachUnitParN_(self, n, f)
}

/**
 * Effectfully maps the elements of this chunk in parallel purely for the effects.
 *
 * @dataFirst mapMUnitParN_
 */
export function mapMUnitParN<A, R, E, B>(
  n: number,
  f: (a: A) => Effect<R, E, B>
): (self: Chunk.Chunk<A>) => Effect<R, E, void> {
  return (self) => mapMUnitParN_(self, n, f)
}
