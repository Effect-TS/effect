import type { UIO } from "../../Effect"
import type { MetricKey } from "../MetricKey"

export interface AtomicCounter {
  readonly metricKey: MetricKey.Counter
  /**
   * The current value of the counter.
   */
  readonly count: (__tsplusTrace?: string) => UIO<number>
  /**
   * Increments the counter by the specified amount.
   */
  readonly increment: (value?: number, __tsplusTrace?: string) => UIO<unknown>

  readonly unsafeCount: () => number
  readonly unsafeIncrement: (value?: number) => void
}
