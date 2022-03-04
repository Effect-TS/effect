import type { Predicate } from "../../../data/Function"
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
  f: Predicate<A>
): STM<unknown, never, Option<A>> {
  return STM.Effect((journal) => {
    concrete(self)
    let i = self.chunk.length
    let res = Option.emptyOf<A>()
    while (res.isNone() && i >= 0) {
      const a = self.chunk.unsafeGet(i)!.unsafeGet(journal)
      if (f(a)) {
        res = Option.some(a)
      }
      i = i - 1
    }
    return res
  })
}

/**
 * Find the last element in the array matching a predicate.
 *
 * @ets_data_first findLast_
 */
export function findLast<A>(f: Predicate<A>) {
  return (self: TArray<A>): STM<unknown, never, Option<A>> => self.findLast(f)
}
