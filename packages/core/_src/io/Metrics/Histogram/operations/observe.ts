import { withHistogram } from "@effect/core/io/Metrics/Histogram/operations/_internal/InternalHistogram";

/**
 * Adds the specified value to the distribution of values represented by
 * this histogram.
 *
 * @tsplus fluent ets/Histogram observe
 */
export function observe_<A>(
  self: Histogram<A>,
  value: number,
  __tsplusTrace?: string
): UIO<unknown> {
  return withHistogram(self, (histogram) => histogram.observe(value));
}

/**
 * Adds the specified value to the distribution of values represented by
 * this histogram.
 *
 * @tsplus static ets/Histogram/Aspects observe
 */
export const observe = Pipeable(observe_);
