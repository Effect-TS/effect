import { withHistogram } from "@effect/core/io/Metrics/Histogram/operations/_internal/InternalHistogram";

/**
 * Returns the current sum of values in this histogram.
 *
 * @tsplus fluent ets/Histogram sum
 */
export function sum<A>(self: Histogram<A>, __tsplusTrace?: string): UIO<number> {
  return withHistogram(self, (histogram) => histogram.sum());
}
