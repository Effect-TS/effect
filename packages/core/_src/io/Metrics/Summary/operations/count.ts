import { withSummary } from "@effect-ts/core/io/Metrics/Summary/operations/_internal/InternalSummary";

/**
 * Returns the current count of all the values ever observed by this
 * summary.
 *
 * @tsplus fluent ets/Summary count
 */
export function count<A>(self: Summary<A>, __tsplusTrace?: string): UIO<number> {
  return withSummary(self, (summary) => summary.count());
}
