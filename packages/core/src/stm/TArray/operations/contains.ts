import type { Equal } from "../../../prelude/Equal"
import type { USTM } from "../../STM"
import type { TArray } from "../definition"

/**
 * Determine if the array contains a specified value.
 *
 * @tsplus fluent ets/TArray contains
 */
export function contains_<A>(self: TArray<A>, equal: Equal<A>) {
  return (a: A): USTM<boolean> => self.exists((_) => equal.equals(_, a))
}

/**
 * Determine if the array contains a specified value.
 *
 * @ets_data_first contains_
 */
export function contains<A>(equal: Equal<A>) {
  return (a: A) => {
    return (self: TArray<A>): USTM<boolean> => self.contains(equal)(a)
  }
}
