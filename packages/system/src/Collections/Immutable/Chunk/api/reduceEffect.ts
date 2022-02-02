// ets_tracing: off

import * as core from "../../../../Effect/core.js"
import type { Effect } from "../../../../Effect/effect.js"
import type * as Chunk from "../core.js"
import { concrete, SingletonTypeId } from "../definition.js"
import { reduce_ } from "./reduce.js"

/**
 * Folds over the elements in this chunk from the left.
 */
export function reduceEffect_<A, R, E, S>(
  self: Chunk.Chunk<A>,
  s: S,
  f: (s: S, a: A) => Effect<R, E, S>
): Effect<R, E, S> {
  concrete(self)
  if (self._typeId === SingletonTypeId) {
    return f(s, self.a)
  }
  return reduce_(self, core.succeed(s) as Effect<R, E, S>, (s, a) =>
    core.chain_(s, (s1) => f(s1, a))
  )
}

/**
 * Folds over the elements in this chunk from the left.
 *
 * @ets_data_first reduceEffect_
 */
export function reduceEffect<A, R, E, S>(
  s: S,
  f: (s: S, a: A) => Effect<R, E, S>
): (self: Chunk.Chunk<A>) => Effect<R, E, S> {
  return (self) => reduceEffect_(self, s, f)
}
