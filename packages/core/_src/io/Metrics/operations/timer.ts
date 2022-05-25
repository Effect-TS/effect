/**
 * Creates a timer metric, based on a histogram, which keeps track of
 * durations in milliseconds. The unit of time will automatically be added to
 * the metric as a tag (i.e. `"time_unit: milliseconds"`).
 */
export function timer(name: string): Metric<MetricKeyType.Histogram, Duration, MetricState.Histogram> {
  const boundaries = Metric.Histogram.Boundaries.exponential(1, 2, 100)
  const base = Metric.histogram(name, boundaries).tagged("time_unit", "milliseconds")
  return base.contramap((duration) => duration.millis)
}
