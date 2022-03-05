import { Entry } from "../../../STM/Entry"
import type { Journal } from "../../../STM/Journal"
import type { Atomic } from "../Atomic"

/**
 * @tsplus fluent ets/AtomicTRef getOrMakeEntry
 */
export function getOrMakeEntry<A>(self: Atomic<A>, journal: Journal) {
  if (journal.has(self)) {
    return journal.get(self)!
  }
  const entry = Entry(self, false)
  journal.set(self, entry)
  return entry
}
