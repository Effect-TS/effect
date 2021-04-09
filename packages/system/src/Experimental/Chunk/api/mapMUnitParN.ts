import type { Effect } from "../../../Effect/effect"
import * as forEach from "../../../Effect/excl-forEach"
import type * as Chunk from "../core"

/**
 * Effectfully maps the elements of this chunk in parallel purely for the effects.
 */
export function mapMUnitPar_<A, R, E, B>(
  self: Chunk.Chunk<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, void> {
  return forEach.forEachUnitPar_(self, f)
}

/**
 * Effectfully maps the elements of this chunk in parallel purely for the effects.
 *
 * @dataFirst mapMUnitPar_
 */
export function mapMUnitPar<A, R, E, B>(
  f: (a: A) => Effect<R, E, B>
): (self: Chunk.Chunk<A>) => Effect<R, E, void> {
  return (self) => mapMUnitPar_(self, f)
}
