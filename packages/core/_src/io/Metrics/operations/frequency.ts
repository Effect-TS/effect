/**
 * A string histogram metric, which keeps track of the counts of different
 * strings.
 *
 * @tsplus static ets/Metrics/Metric/Ops frequency
 */
export function frequency(name: string): Metric.Frequency<string> {
  return Metric.fromMetricKey(MetricKey.Frequency(name))
}
