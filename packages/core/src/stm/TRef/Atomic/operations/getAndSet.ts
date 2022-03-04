import type { USTM } from "../../../STM"
import { STMEffect } from "../../../STM"
import type { Atomic } from "../Atomic"

/**
 * Sets the value of the `XTRef.Atomic` and returns the old value.
 *
 * @tsplus fluent ets/AtomicTRef getAndSet
 */
export function getAndSet_<A>(self: Atomic<A>, a: A): USTM<A> {
  return new STMEffect((journal) =>
    self.getOrMakeEntry(journal).use((entry) => {
      const oldValue = entry.unsafeGet<A>()
      entry.unsafeSet(a)
      return oldValue
    })
  )
}

/**
 * Sets the value of the `XTRef.Atomic` and returns the old value.
 *
 * @ets_data_first getAndSet_
 */
export function getAndSet<A>(a: A) {
  return (self: Atomic<A>): USTM<A> => self.getAndSet(a)
}
