import { withHistogram } from "@effect/core/io/Metrics/Histogram/operations/_internal/InternalHistogram";

/**
 * Returns the current sum and count of values in each bucket of this
 * histogram.
 *
 * @tsplus fluent ets/Histogram buckets
 */
export function buckets<A>(
  self: Histogram<A>,
  __tsplusTrace?: string
): UIO<Chunk<Tuple<[number, number]>>> {
  return withHistogram(self, (histogram) => histogram.buckets());
}
