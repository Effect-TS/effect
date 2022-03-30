import type { USTM } from "../../STM"
import { STM } from "../../STM"
import type { TRef } from "../definition"
import { getOrMakeEntry } from "./_internal/getOrMakeEntry"

/**
 * Retrieves the value of the `TRef`.
 *
 * @tsplus fluent ets/TRef get
 */
export function get<A>(self: TRef<A>): USTM<A> {
  return STM.Effect((journal) =>
    getOrMakeEntry(self, journal).use((_) => _.unsafeGet())
  )
}
