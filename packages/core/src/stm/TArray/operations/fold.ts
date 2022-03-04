import type { USTM } from "../../STM"
import { STM } from "../../STM"
import type { TArray } from "../definition"
import { concrete } from "./_internal/InternalTArray"

/**
 * Atomically folds using a pure function.
 *
 * @tsplus fluent ets/TArray reduce
 */
export function reduce_<A, Z>(self: TArray<A>, zero: Z, f: (z: Z, a: A) => Z): USTM<Z> {
  return STM.Effect((journal) => {
    let result = zero
    let i = 0
    concrete(self)
    while (i < self.chunk.length) {
      const value = self.chunk.unsafeGet(i)!.unsafeGet(journal)
      result = f(result, value)
      i = i + 1
    }
    return result
  })
}

/**
 * Atomically folds using a pure function.
 *
 * @ets_data_first reduce_
 */
export function reduce<A, Z>(zero: Z, f: (z: Z, a: A) => Z) {
  return (self: TArray<A>): USTM<Z> => self.reduce(zero, f)
}
