/**
 * A numeric histogram metric, which keeps track of the count of numbers that
 * fall in bins with the specified boundaries.
 *
 * @tsplus static effect/core/io/Metrics/Metric.Ops histogram
 * @category constructors
 * @since 1.0.0
 */
export function histogram(name: string, boundaries: Metric.Histogram.Boundaries) {
  return Metric.fromMetricKey(MetricKey.Histogram(name, boundaries))
}
