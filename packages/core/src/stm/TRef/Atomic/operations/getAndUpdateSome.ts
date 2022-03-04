import type { Option } from "../../../../data/Option"
import type { USTM } from "../../../STM"
import { STMEffect } from "../../../STM"
import type { Atomic } from "../Atomic"

/**
 * Updates some values of the variable but leaves others alone, returning
 * the old value.
 *
 * @tsplus fluent ets/AtomicTRef getAndUpdateSome
 */
export function getAndUpdateSome_<A>(
  self: Atomic<A>,
  pf: (a: A) => Option<A>
): USTM<A> {
  return new STMEffect((journal) =>
    self.getOrMakeEntry(journal).use((entry) => {
      const oldValue = entry.unsafeGet<A>()
      const result = pf(oldValue)
      if (result._tag === "Some") {
        entry.unsafeSet(result.value)
        return result.value
      }
      return oldValue
    })
  )
}

/**
 * Updates some values of the variable but leaves others alone, returning
 * the old value.
 *
 * @ets_data_first getAndUpdateSome_
 */
export function getAndUpdateSome<A>(f: (a: A) => Option<A>) {
  return (self: Atomic<A>): USTM<A> => self.getAndUpdateSome(f)
}
