import type { Option } from "../../../data/Option"
import type { Ord } from "../../../prelude/Ord"
import { gt } from "../../../prelude/Ord"
import type { USTM } from "../../STM"
import type { TArray } from "../definition"

/**
 * Atomically compute the greatest element in the array, if it exists.
 *
 * @tsplus fluent ets/TArray maxOption
 */
export function maxOption_<A>(self: TArray<A>, ord: Ord<A>): USTM<Option<A>> {
  const isGreaterThan = gt(ord)
  return self.reduceOption((acc, a) => (isGreaterThan(a, acc) ? a : acc))
}

/**
 * Atomically compute the greatest element in the array, if it exists.
 *
 * @ets_data_first maxOption_
 */
export function maxOption<A>(ord: Ord<A>) {
  return (self: TArray<A>): USTM<Option<A>> => self.maxOption(ord)
}
