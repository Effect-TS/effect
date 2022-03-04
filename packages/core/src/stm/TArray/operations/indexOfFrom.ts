import type { Equal } from "../../../prelude/Equal"
import type { USTM } from "../../STM"
import type { TArray } from "../definition"

/**
 * Get the first index of a specific value in the array, starting at a
 * specific index, or -1 if it does not occur.
 *
 * @tsplus fluent ets/TArray indexOfFrom
 */
export function indexOfFrom_<A>(self: TArray<A>, equal: Equal<A>) {
  return (a: A, from: number): USTM<number> =>
    self.indexWhereFrom((_) => equal.equals(_, a), from)
}

/**
 * Get the first index of a specific value in the array, starting at a
 * specific index, or -1 if it does not occur.
 *
 * @ets_data_first indexOfFrom_
 */
export function indexOfFrom<A>(equal: Equal<A>) {
  return (a: A, from: number) => {
    return (self: TArray<A>): USTM<number> => self.indexOfFrom(equal)(a, from)
  }
}
