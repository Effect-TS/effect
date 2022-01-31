import { Effect } from "../../../../io/Effect/definition"
import { concrete, SingletonTypeId } from "../_definition"
import type * as Chunk from "../core"
import { reduce_ } from "./reduce"

/**
 * Folds over the elements in this chunk from the left.
 */
export function reduceEffect_<A, R, E, S>(
  self: Chunk.Chunk<A>,
  s: S,
  f: (s: S, a: A) => Effect<R, E, S>,
  __etsTrace?: string
): Effect<R, E, S> {
  concrete(self)
  if (self._typeId === SingletonTypeId) {
    return f(s, self.a)
  }
  return reduce_(self, Effect.succeedNow(s) as Effect<R, E, S>, (s, a) =>
    s.flatMap((s1) => f(s1, a))
  )
}

/**
 * Folds over the elements in this chunk from the left.
 *
 * @ets_data_first reduceEffect_
 */
export function reduceEffect<A, R, E, S>(
  s: S,
  f: (s: S, a: A) => Effect<R, E, S>,
  __etsTrace?: string
): (self: Chunk.Chunk<A>) => Effect<R, E, S> {
  return (self) => reduceEffect_(self, s, f)
}
