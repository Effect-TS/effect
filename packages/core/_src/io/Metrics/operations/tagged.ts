/**
 * Returns a new metric, which is identical in every way to this one, except
 * the specified tags have been added to the tags of this metric.
 *
 * @tsplus static effect/core/io/Metrics/Metric tagged
 * @tsplus pipeable effect/core/io/Metrics/Metric tagged
 */
export function tagged<Type, In, Out>(key: string, value: string) {
  return (self: Metric<Type, In, Out>): Metric<Type, In, Out> =>
    self.taggedWithLabelSet(HashSet(MetricLabel(key, value)))
}
