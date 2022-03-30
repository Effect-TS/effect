import type { USTM } from "../../STM"
import { STM } from "../../STM"
import type { TRef } from "../definition"
import { getOrMakeEntry } from "./_internal/getOrMakeEntry"

/**
 * Updates the value of the variable and returns the old value.
 *
 * @tsplus fluent ets/TRef getAndUpdate
 */
export function getAndUpdate_<A>(self: TRef<A>, f: (a: A) => A): USTM<A> {
  return STM.Effect((journal) => {
    const entry = getOrMakeEntry(self, journal)
    const oldValue = entry.use((_) => _.unsafeGet<A>())
    entry.use((_) => _.unsafeSet(f(oldValue)))
    return oldValue
  })
}

/**
 * Updates the value of the variable and returns the old value.
 */
export const getAndUpdate = Pipeable(getAndUpdate_)
