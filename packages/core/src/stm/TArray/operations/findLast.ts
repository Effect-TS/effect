import type { Predicate } from "packages/core/src/data/Function"

import { Option } from "../../../data/Option"
import { STM } from "../../STM"
import type { TArray } from "../definition"
import { concrete } from "./_internal/InternalTArray"

/**
 * Find the last element in the array matching a predicate.
 *
 * @tsplus fluent ets/TArray findLast
 */
export function findLast_<A>(
  self: TArray<A>,
  p: Predicate<A>
): STM<unknown, never, Option<A>> {
  return STM.Effect((journal) => {
    let i = 0
    let res = Option.emptyOf<A>()
    concrete(self)
    while (i < self.chunk.length) {
      const a = self.chunk.unsafeGet(i)!.unsafeGet(journal)
      if (p(a)) {
        res = Option.some(a)
      }
      i++
    }
    return res
  })
}

/**
 * Find the last element in the array matching a predicate.
 *
 * @ets_data_first find_
 */
export function findLast<A>(p: Predicate<A>) {
  return (self: TArray<A>): STM<unknown, never, Option<A>> => self.findLast(p)
}
