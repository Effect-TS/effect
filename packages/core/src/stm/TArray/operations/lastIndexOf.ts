import type { Equal } from "../../../prelude/Equal"
import type { USTM } from "../../STM"
import type { TArray } from "../definition"

/**
 * Get the first index of a specific value in the arrayor -1 if it does not
 * occur.
 *
 * @tsplus fluent ets/TArray lastIndexOf
 */
export function lastIndexOf_<A>(self: TArray<A>, equal: Equal<A>) {
  return (a: A): USTM<number> => {
    return self.lastIndexOfFrom(equal)(a, self.size - 1)
  }
}

/**
 * Get the first index of a specific value in the arrayor -1 if it does not
 * occur.
 *
 * @ets_data_first lastIndexOf_
 */
export function lastIndexOf<A>(equal: Equal<A>) {
  return (a: A) => {
    return (self: TArray<A>): USTM<number> => self.lastIndexOf(equal)(a)
  }
}
