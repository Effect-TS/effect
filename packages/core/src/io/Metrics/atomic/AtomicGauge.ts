import type { UIO } from "../../Effect"
import type { MetricKey } from "../MetricKey"

export interface AtomicGauge {
  readonly metricKey: MetricKey.Gauge
  /**
   * The current value of the gauge.
   */
  readonly value: (__tsplusTrace?: string) => UIO<number>
  /**
   * Sets the gauge to the specified value.
   */
  readonly set: (value: number, __tsplusTrace?: string) => UIO<unknown>
  /**
   * Adjusts the gauge by the specified amount.
   */
  readonly adjust: (value: number, __tsplusTrace?: string) => UIO<unknown>
}
