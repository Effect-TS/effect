/**
 * Returns a new metric, which is identical in every way to this one, except
 * the specified tags have been added to the tags of this metric.
 *
 * @tsplus static effect/core/io/Metrics/Metric.Aspects taggedWithLabels
 * @tsplus pipeable effect/core/io/Metrics/Metric taggedWithLabels
 */
export function taggedWithLabels<Type, In, Out>(extraTags: Collection<MetricLabel>) {
  return (self: Metric<Type, In, Out>): Metric<Type, In, Out> =>
    self.taggedWithLabelSet(HashSet.from(extraTags))
}
