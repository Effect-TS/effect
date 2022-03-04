import type { Tuple } from "../../../../collection/immutable/Tuple"
import type { USTM } from "../../../STM"
import { STMEffect } from "../../../STM"
import type { Atomic } from "../Atomic"

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 *
 * @tsplus fluent ets/AtomicTRef modify
 */
export function modify_<A, B>(self: Atomic<A>, f: (a: A) => Tuple<[B, A]>): USTM<B> {
  return new STMEffect((journal) =>
    self.getOrMakeEntry(journal).use((entry) => {
      const {
        tuple: [retValue, newValue]
      } = f(entry.unsafeGet())
      entry.unsafeSet(newValue)
      return retValue
    })
  )
}

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 *
 * @ets_data_first modify_
 */
export function modify<A, B>(f: (a: A) => Tuple<[B, A]>) {
  return (self: Atomic<A>): USTM<B> => self.modify(f)
}
