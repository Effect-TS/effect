import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { Tuple } from "../../../../collection/immutable/Tuple"
import type { UIO } from "../../../Effect"
import type { Histogram } from "../definition"
import { withHistogram } from "./_internal/InternalHistogram"

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
  return withHistogram(self, (histogram) => histogram.buckets())
}
