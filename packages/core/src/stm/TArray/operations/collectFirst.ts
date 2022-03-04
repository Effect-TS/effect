import type { Option } from "../../../data/Option"
import type { USTM } from "../../STM"
import type { TArray } from "../definition"

/**
 * Finds the result of applying a partial function to the first value in its
 * domain.
 *
 * @tsplus fluent ets/TArray collectFirst
 */
export function collectFirst_<A, B>(
  self: TArray<A>,
  pf: (a: A) => Option<B>
): USTM<Option<B>> {
  return self.find((a) => pf(a).isSome()).map((option) => option.flatMap(pf))
}

/**
 * Finds the result of applying a partial function to the first value in its
 * domain.
 *
 * @ets_data_first collectFirst_
 */
export function collectFirst<A, B>(pf: (a: A) => Option<B>) {
  return (self: TArray<A>): USTM<Option<B>> => self.collectFirst(pf)
}
