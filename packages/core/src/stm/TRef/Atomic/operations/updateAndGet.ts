import type { USTM } from "../../../STM"
import { STMEffect } from "../../../STM"
import type { Atomic } from "../Atomic"

/**
 * Updates the value of the variable and returns the new value.
 *
 * @tsplus fluent ets/AtomicTRef updateAndGet
 */
export function updateAndGet_<A>(self: Atomic<A>, f: (a: A) => A): USTM<A> {
  return new STMEffect((journal) =>
    self.getOrMakeEntry(journal).use((entry) => {
      const newValue = f(entry.unsafeGet<A>())
      entry.unsafeSet(newValue)
      return newValue
    })
  )
}

/**
 * Updates the value of the variable and returns the new value.
 *
 * @ets_data_first updateAndGet_
 */
export function updateAndGet<A>(f: (a: A) => A) {
  return (self: Atomic<A>): USTM<A> => self.updateAndGet(f)
}
