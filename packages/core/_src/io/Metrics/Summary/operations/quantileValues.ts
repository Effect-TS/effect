import { withSummary } from "@effect-ts/core/io/Metrics/Summary/operations/_internal/InternalSummary";

/**
 * Returns the values corresponding to each quantile in this summary.
 *
 * @tsplus fluent ets/Summary quantileValues
 */
export function quantileValues<A>(
  self: Summary<A>,
  __tsplusTrace?: string
): UIO<Chunk<Tuple<[number, Option<number>]>>> {
  return withSummary(self, (summary) => summary.quantileValues());
}
