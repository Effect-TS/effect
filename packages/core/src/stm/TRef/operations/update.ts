import type { USTM } from "../../STM"
import { STM } from "../../STM"
import type { TRef } from "../definition"
import { getOrMakeEntry } from "./_internal/getOrMakeEntry"

/**
 * Updates the value of the variable.
 *
 * @tsplus fluent ets/TRef update
 */
export function update_<A>(self: TRef<A>, f: (a: A) => A): USTM<void> {
  return STM.Effect((journal) => {
    const entry = getOrMakeEntry(self, journal)
    const newValue = entry.use((_) => f(_.unsafeGet()))
    entry.use((_) => _.unsafeSet(newValue))
    return undefined
  })
}

/**
 * Updates the value of the variable.
 */
export const update = Pipeable(update_)
