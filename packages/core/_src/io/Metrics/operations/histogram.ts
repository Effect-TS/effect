/**
 * A numeric histogram metric, which keeps track of the count of numbers that
 * fall in bins with the specified boundaries.
 *
 * @tsplus static ets/Metrics/Metric/Ops histogram
 */
export function histogram(name: string, boundaries: Metric.Histogram.Boundaries) {
  return Metric.fromMetricKey(MetricKey.Histogram(name, boundaries))
}
