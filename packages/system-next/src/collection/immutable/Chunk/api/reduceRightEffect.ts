import type { Effect } from "../../../../io/Effect/definition"
import { chain_ } from "../../../../io/Effect/operations/chain"
import { succeedNow } from "../../../../io/Effect/operations/succeedNow"
import { concrete, SingletonTypeId } from "../_definition"
import type * as Chunk from "../core"
import { reduceRight_ } from "./reduceRight"

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
  return reduceRight_(self, succeedNow(s) as Effect<R, E, S>, (a, s) =>
    chain_(s, (s1) => f(a, s1))
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
