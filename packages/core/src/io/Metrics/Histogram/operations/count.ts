import type { UIO } from "../../../Effect"
import type { Histogram } from "../definition"
import { withHistogram } from "./_internal/InternalHistogram"

/**
 * Returns the current count of values in this histogram.
 *
 * @tsplus fluent ets/Histogram count
 */
export function count<A>(self: Histogram<A>, __tsplusTrace?: string): UIO<number> {
  return withHistogram(self, (histogram) => histogram.count())
}
