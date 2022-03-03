import type { UIO } from "../../../Effect"
import type { Summary } from "../definition"
import { withSummary } from "./_internal/InternalSummary"

/**
 * Returns the current count of all the values ever observed by this
 * summary.
 *
 * @tsplus fluent ets/Summary count
 */
export function count<A>(self: Summary<A>, __tsplusTrace?: string): UIO<number> {
  return withSummary(self, (summary) => summary.count())
}
