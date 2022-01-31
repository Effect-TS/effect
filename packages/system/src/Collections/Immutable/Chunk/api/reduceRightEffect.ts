// ets_tracing: off

import * as core from "../../../../Effect/core.js"
import type { Effect } from "../../../../Effect/effect.js"
import type * as Chunk from "../core.js"
import { concrete, SingletonTypeId } from "../definition.js"
import { reduceRight_ } from "./reduceRight.js"

/**
 * Folds over the elements in this chunk from the right.
 */
export function reduceRightEffect_<A, R, E, S>(
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
 * @ets_data_first reduceRightEffect_
 */
export function reduceRightEffect<A, R, E, S>(
  s: S,
  f: (a: A, s: S) => Effect<R, E, S>
): (self: Chunk.Chunk<A>) => Effect<R, E, S> {
  return (self) => reduceRightEffect_(self, s, f)
}
