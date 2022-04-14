/**
 * A counter, which can be incremented by numbers.
 *
 * @tsplus static ets/Metrics/Metric/Ops counter
 */
export function counter(name: string): Metric.Counter<number> {
  return Metric.fromMetricKey(MetricKey.Counter(name));
}
