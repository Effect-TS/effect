import { Entry } from "../../../STM/Entry"
import type { Journal } from "../../../STM/Journal"
import type { TRef } from "../../definition"

export function getOrMakeEntry<A>(self: TRef<A>, journal: Journal): Entry {
  if (journal.has(self)) {
    return journal.get(self)!
  }
  const entry = Entry(self, false)
  journal.set(self, entry)
  return entry
}
