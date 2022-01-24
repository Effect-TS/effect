import type { Chunk } from "../../collection/immutable/Chunk/core"
import type { Tuple } from "../../collection/immutable/Tuple"
import type { Option } from "../../data/Option"
import { _A } from "../../support/Symbols"
import type { UIO } from "./_internal/effect"

/**
 * A `Summary` represents a sliding window of a time series along with metrics
 * for certain percentiles of the time series, referred to as quantiles.
 * Quantiles describe specified percentiles of the sliding window that are of
 * interest. For example, if we were using a summary to track the response time
 * for requests over the last hour then we might be interested in the 50th
 * percentile, 90th percentile, 95th percentile, and 99th percentile for
 * response times.
 */
export class Summary<A> {
  readonly [_A]: (_: A) => void

  constructor(
    /**
     * The current count of all the values ever observed by this dsummary.
     */
    readonly count: UIO<number>,
    /**
     * The current sum of all the values ever observed by the summary.
     */
    readonly sum: UIO<number>,
    /**
     * Adds the specified value to the time series represented by the summary,
     * also recording the Instant when the value was observed
     */
    readonly observe: (value: number, __trace?: string) => UIO<any>,
    /**
     * The values corresponding to each quantile in the summary.
     */
    readonly quantileValues: UIO<Chunk<Tuple<[number, Option<number>]>>>
  ) {}
}
