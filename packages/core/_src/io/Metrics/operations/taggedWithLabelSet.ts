/**
 * Returns a new metric, which is identical in every way to this one, except
 * the specified tags have been added to the tags of this metric.
 *
 * @tsplus static effect/core/io/Metrics/Metric.Aspects taggedWithLabelSet
 * @tsplus pipeable effect/core/io/Metrics/Metric taggedWithLabelSet
 */
export function taggedWithLabelSet(extraTags: HashSet<MetricLabel>) {
  return <Type, In, Out>(self: Metric<Type, In, Out>): Metric<Type, In, Out> =>
    Metric(
      self.keyType,
      (input, extraTags1) => self.unsafeUpdate(input, extraTags.union(extraTags1)),
      (extraTags1) => self.unsafeValue(extraTags.union(extraTags1))
    )
}
