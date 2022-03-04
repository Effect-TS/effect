import type { Predicate } from "../../../data/Function"
import type { USTM } from "../../STM"
import { STM } from "../../STM"
import type { TArray } from "../definition"
import { concrete } from "./_internal/InternalTArray"

/**
 * Get the index of the first entry in the array, starting at a specific
 * index, matching a predicate.
 *
 * @tsplus fluent ets/TArray indexWhereFrom
 */
export function indexWhereFrom_<A>(
  self: TArray<A>,
  f: Predicate<A>,
  from: number
): USTM<number> {
  if (from < 0) {
    return STM.succeedNow(-1)
  }
  return STM.Effect((journal) => {
    let i = from
    let found = false
    concrete(self)
    while (!found && i < self.chunk.length) {
      const a = self.chunk.unsafeGet(i)!.unsafeGet(journal)
      found = f(a)
      i = i + 1
    }
    return found ? i - 1 : -1
  })
}

/**
 * Get the index of the first entry in the array, starting at a specific
 * index, matching a predicate.
 *
 * @ets_data_first indexWhereFrom_
 */
export function indexWhereFrom<A>(f: Predicate<A>, from: number) {
  return (self: TArray<A>): USTM<number> => self.indexWhereFrom(f, from)
}
