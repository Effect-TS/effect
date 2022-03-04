import { Option } from "../../../data/Option"
import type { USTM } from "../../STM"
import { STM } from "../../STM"
import type { TArray } from "../definition"
import { concrete } from "./_internal/InternalTArray"

/**
 * Atomically reduce the array, if non-empty, by a binary operator.
 *
 * @tsplus fluent ets/TArray reduceOption
 */
export function reduceOption_<A>(
  self: TArray<A>,
  f: (x: A, y: A) => A
): USTM<Option<A>> {
  return STM.Effect((journal) => {
    let i = 0
    let result: A | undefined = undefined
    concrete(self)
    while (i < self.chunk.length) {
      const a = self.chunk.unsafeGet(i)!.unsafeGet(journal)
      result = result == null ? a : f(a, result)
      i = i + 1
    }
    return Option.fromNullable(result)
  })
}

/**
 * Atomically reduce the array, if non-empty, by a binary operator.
 *
 * @ets_data_first reduceOption_
 */
export function reduceOption<A>(f: (x: A, y: A) => A) {
  return (self: TArray<A>): USTM<Option<A>> => self.reduceOption(f)
}
