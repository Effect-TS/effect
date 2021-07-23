import * as core from "../../../../Effect/core"
import type { Effect } from "../../../../Effect/effect"
import type * as Chunk from "../core"
import { concrete, SingletonTypeId } from "../definition"
import { reduceRight_ } from "./reduceRight"

/**
 * Folds over the elements in this chunk from the right.
 */
export function reduceRightM_<A, R, E, S>(
  self: Chunk.Chunk<A>,
  s: S,
  f: (a: A, s: S) => Effect<R, E, S>
): Effect<R, E, S> {
  concrete(self)
  if (self._typeId === SingletonTypeId) {
    return f(self.a, s)
  }
  return reduceRight_(self, core.succeed(s) as Effect<R, E, S>, (a, s) =>
    core.chain_(s, (s1) => f(a, s1))
  )
}

/**
 * Folds over the elements in this chunk from the right.
 *
 * @ets_data_first reduceRightM_
 */
export function reduceRightM<A, R, E, S>(
  s: S,
  f: (a: A, s: S) => Effect<R, E, S>
): (self: Chunk.Chunk<A>) => Effect<R, E, S> {
  return (self) => reduceRightM_(self, s, f)
}
