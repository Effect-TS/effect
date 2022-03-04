import type { USTM } from "../../../STM"
import { STMEffect } from "../../../STM"
import type { Atomic } from "../Atomic"

/**
 * Updates the value of the variable.
 *
 * @tsplus fluent ets/AtomicTRef update
 */
export function update_<A>(self: Atomic<A>, f: (a: A) => A): USTM<void> {
  return new STMEffect((journal) =>
    self
      .getOrMakeEntry(journal)
      .use((entry) => entry.unsafeSet(f(entry.unsafeGet<A>())))
  )
}

/**
 * Updates the value of the variable.
 *
 * @ets_data_first update_
 */
export function update<A>(f: (a: A) => A) {
  return (self: Atomic<A>): USTM<void> => self.update(f)
}
