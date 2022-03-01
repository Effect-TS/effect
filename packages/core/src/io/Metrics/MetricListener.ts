import type { MetricKey } from "./MetricKey"

/**
 * A `MetricListener` is capable of taking some action in response to a metric
 * being recorded, such as sending that metric to a third party service.
 */
export interface MetricListener {
  readonly unsafeCounterObserved: (
    key: MetricKey.Counter,
    value: number,
    delta: number
  ) => void
  readonly unsafeGaugeObserved: (
    key: MetricKey.Gauge,
    absValue: number,
    delta: number
  ) => void
  readonly unsafeHistogramObserved: (key: MetricKey.Histogram, value: number) => void
  readonly unsafeSummaryObserved: (key: MetricKey.Summary, value: number) => void
  readonly unsafeSetObserved: (key: MetricKey.SetCount, word: string) => void
}
