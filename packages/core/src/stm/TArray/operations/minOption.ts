import type { Option } from "../../../data/Option"
import type { Ord } from "../../../prelude/Ord"
import { lt } from "../../../prelude/Ord"
import type { USTM } from "../../STM"
import type { TArray } from "../definition"

/**
 * Atomically compute the least element in the array, if it exists.
 *
 * @tsplus fluent ets/TArray minOption
 */
export function minOption_<A>(self: TArray<A>, ord: Ord<A>): USTM<Option<A>> {
  const isLessThan = lt(ord)
  return self.reduceOption((acc, a) => (isLessThan(a, acc) ? a : acc))
}

/**
 * Atomically compute the least element in the array, if it exists.
 *
 * @ets_data_first minOption_
 */
export function minOption<A>(ord: Ord<A>) {
  return (self: TArray<A>): USTM<Option<A>> => self.minOption(ord)
}
