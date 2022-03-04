import type { USTM } from "../../../STM"
import { STMEffect } from "../../../STM"
import type { Atomic } from "../Atomic"

/**
 * Updates the value of the variable and returns the old value.
 *
 * @tsplus fluent ets/AtomicTRef getAndUpdate
 */
export function getAndUpdate_<A>(self: Atomic<A>, f: (a: A) => A): USTM<A> {
  return new STMEffect((journal) =>
    self.getOrMakeEntry(journal).use((entry) => {
      const oldValue = entry.unsafeGet<A>()
      entry.unsafeSet(f(oldValue))
      return oldValue
    })
  )
}

/**
 * Updates the value of the variable and returns the old value.
 *
 * @ets_data_first getAndUpdate_
 */
export function getAndUpdate<A>(f: (a: A) => A) {
  return (self: Atomic<A>): USTM<A> => self.getAndUpdate(f)
}
