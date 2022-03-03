import type { UIO } from "../../../Effect"
import type { Summary } from "../definition"
import { withSummary } from "./_internal/InternalSummary"

/**
 * Returns the current sum of all the values ever observed by this summary.
 *
 * @tsplus fluent ets/Summary sum
 */
export function sum<A>(self: Summary<A>, __tsplusTrace?: string): UIO<number> {
  return withSummary(self, (summary) => summary.sum())
}
