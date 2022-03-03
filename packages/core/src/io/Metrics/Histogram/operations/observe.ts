import type { UIO } from "../../../Effect"
import type { Histogram } from "../definition"
import { withHistogram } from "./_internal/InternalHistogram"

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
  return withHistogram(self, (histogram) => histogram.observe(value))
}

/**
 * Adds the specified value to the distribution of values represented by
 * this histogram.
 *
 * @ets_data_first observe_
 */
export function observe(value: number, __tsplusTrace?: string) {
  return <A>(self: Histogram<A>): UIO<unknown> => self.observe(value)
}
