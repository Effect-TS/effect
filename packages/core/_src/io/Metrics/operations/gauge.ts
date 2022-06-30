/**
 * A gauge, which can be set to a value.
 *
 * @tsplus static effect/core/io/Metrics/Metric.Ops gauge
 */
export function gauge(name: string): Metric.Gauge<number> {
  return Metric.fromMetricKey(MetricKey.Gauge(name))
}
