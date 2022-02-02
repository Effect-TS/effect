import { Effect } from "../../../../io/Effect"
import type { Chunk } from "../definition"
import { concrete, SingletonTypeId } from "../definition"
import { reduce_ } from "./reduce"

/**
 * Folds over the elements in this chunk from the left.
 *
 * @tsplus fluent ets/Chunk reduceEffect
 */
export function reduceEffect_<A, R, E, S>(
  self: Chunk<A>,
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
) {
  return (self: Chunk<A>): Effect<R, E, S> => self.reduceEffect(s, f)
}
