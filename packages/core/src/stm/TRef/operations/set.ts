import type { USTM } from "../../STM"
import { STM } from "../../STM"
import type { TRef } from "../definition"
import { getOrMakeEntry } from "./_internal/getOrMakeEntry"

/**
 * Sets the value of the `TRef`.
 *
 * @tsplus fluent ets/TRef set
 */
export function set_<A>(self: TRef<A>, a: A): USTM<void> {
  return STM.Effect((journal) => {
    const entry = getOrMakeEntry(self, journal)
    entry.use((_) => _.unsafeSet(a))
    return undefined
  })
}

/**
 * Sets the value of the `TRef`.
 */
export const set = Pipeable(set_)
