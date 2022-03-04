import type { Equal } from "../../../prelude/Equal"
import type { USTM } from "../../STM"
import type { TArray } from "../definition"

/**
 * Get the first index of a specific value in the array or -1 if it does not
 * occur.
 *
 * @tsplus fluent ets/TArray indexOf
 */
export function indexOf_<A>(self: TArray<A>, equal: Equal<A>) {
  return (a: A): USTM<number> => self.indexOfFrom(equal)(a, 0)
}

/**
 * Get the first index of a specific value in the array or -1 if it does not
 * occur.
 *
 * @ets_data_first indexOf_
 */
export function indexOf<A>(equal: Equal<A>) {
  return (a: A) => {
    return (self: TArray<A>): USTM<number> => self.indexOf(equal)(a)
  }
}
