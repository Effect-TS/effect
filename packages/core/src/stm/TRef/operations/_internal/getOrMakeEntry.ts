import type { Journal } from "@effect/core/stm/STM/definition/primitives"
import { Entry } from "@effect/core/stm/STM/Entry"

/** @internal */
export function getOrMakeEntry<A>(self: TRef<A>, journal: Journal): Entry {
  if (journal.has(self)) {
    return journal.get(self)!
  }
  const entry = Entry(self, false)
  journal.set(self, entry)
  return entry
}
