import { Effect } from "../../../../io/Effect"
import type { Chunk } from "../definition"
import { concrete, SingletonTypeId } from "../definition"

/**
 * Folds over the elements in this chunk from the right.
 *
 * @tsplus fluent ets/Chunk reduceRightEffect
 */
export function reduceRightEffect_<A, R, E, S>(
  self: Chunk<A>,
  s: S,
  f: (a: A, s: S) => Effect<R, E, S>,
  __tsplusTrace?: string
): Effect<R, E, S> {
  concrete(self)
  if (self._typeId === SingletonTypeId) {
    return f(self.a, s)
  }
  return (self as Chunk<A>).reduceRight(
    Effect.succeedNow(s) as Effect<R, E, S>,
    (a, s) => s.flatMap((s1) => f(a, s1))
  )
}

/**
 * Folds over the elements in this chunk from the right.
 *
 * @ets_data_first reduceRightEffect_
 */
export function reduceRightEffect<A, R, E, S>(
  s: S,
  f: (a: A, s: S) => Effect<R, E, S>,
  __tsplusTrace?: string
) {
  return (self: Chunk<A>): Effect<R, E, S> => self.reduceRightEffect(s, f)
}
