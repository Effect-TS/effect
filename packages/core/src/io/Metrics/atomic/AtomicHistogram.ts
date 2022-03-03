import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Tuple } from "../../../collection/immutable/Tuple"
import type { UIO } from "../../Effect"
import type { MetricKey } from "../MetricKey"

export interface AtomicHistogram {
  readonly metricKey: MetricKey.Histogram
  /**
   * The current count of values in the histogram.
   */
  readonly count: (__tsplusTrace?: string) => UIO<number>
  /**
   * The current sum and count of values in each bucket of the histogram.
   */
  readonly buckets: (__tsplusTrace?: string) => UIO<Chunk<Tuple<[number, number]>>>
  /**
   * Adds the specified value to the distribution of values represented by the
   * histogram.
   */
  readonly observe: (value: number, __tsplusTrace?: string) => UIO<unknown>
  /**
   * The current sum of values in the histogram.
   */
  readonly sum: (__tsplusTrace?: string) => UIO<number>

  readonly unsafeObserve: (value: number) => void
}
