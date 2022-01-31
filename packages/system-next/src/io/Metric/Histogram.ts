import type { Chunk } from "../../collection/immutable/Chunk/core"
import type { Tuple } from "../../collection/immutable/Tuple"
import { _A } from "../../support/Symbols"
import type { UIO } from "../Effect"

/**
 * A `Histogram` is a metric representing a collection of numerical with the
 * distribution of the cumulative values over time. A typical use of this metric
 * would be to track the time to serve requests. Histograms allow visualizing
 * not only the value of the quantity being measured but its distribution.
 * Histograms are constructed with user specified boundaries which describe the
 * buckets to aggregate values into.
 */
export class Histogram<A> {
  readonly [_A]: (_: A) => void

  constructor(
    /**
     * The current count of values in the histogram.
     */
    readonly count: UIO<number>,
    /**
     * The current sum of values in the histogram.
     */
    readonly sum: UIO<number>,
    /**
     * The current sum and count of values in each bucket of the histogram.
     */
    readonly buckets: UIO<Chunk<Tuple<[number, number]>>>,
    /**
     * Adds the specified value to the distribution of values represented by the
     * histogram.
     */
    readonly observe: (value: number, __trace?: string) => UIO<any>,

    readonly unsafeObserve: (value: number) => void
  ) {}
}
