import type { Equal } from "../../../prelude/Equal"
import type { USTM } from "../../STM"
import { STM } from "../../STM"
import type { TArray } from "../definition"
import { concrete } from "./_internal/InternalTArray"

/**
 * Get the first index of a specific value in the array, bounded above by a
 * specific index, or -1 if it does not occur.
 *
 * @tsplus fluent ets/TArray lastIndexOfFrom
 */
export function lastIndexOfFrom_<A>(self: TArray<A>, equal: Equal<A>) {
  return (a: A, end: number): USTM<number> => {
    concrete(self)
    if (end >= self.chunk.length) {
      return STM.succeedNow(-1)
    }
    return STM.Effect((journal) => {
      let i = end
      let found = false
      while (!found && i >= 0) {
        const value = self.chunk.unsafeGet(i)!.unsafeGet(journal)
        found = equal.equals(value, a)
        i = i - 1
      }
      return found ? i + 1 : -1
    })
  }
}

/**
 * Get the first index of a specific value in the array, bounded above by a
 * specific index, or -1 if it does not occur.
 *
 * @ets_data_first lastIndexOfFrom_
 */
export function lastIndexOfFrom<A>(equal: Equal<A>) {
  return (a: A, end: number) => {
    return (self: TArray<A>): USTM<number> => self.lastIndexOfFrom(equal)(a, end)
  }
}
