/**
 * Returns a new metric, which is identical in every way to this one, except
 * the specified tags have been added to the tags of this metric.
 *
 * @tsplus fluent ets/Metrics/Metric taggedWithLabelSet
 */
export function taggedWithLabelSet_<Type, In, Out>(
  self: Metric<Type, In, Out>,
  extraTags: HashSet<MetricLabel>
): Metric<Type, In, Out> {
  return Metric(
    self.keyType,
    (input, extraTags1) => self.unsafeUpdate(input, extraTags.union(extraTags1)),
    (extraTags1) => self.unsafeValue(extraTags.union(extraTags1))
  );
}

/**
 * Returns a new metric, which is identical in every way to this one, except
 * the specified tags have been added to the tags of this metric.
 *
 * @tsplus static ets/Metrics/Metric/Aspects taggedWithLabelSet
 */
export const taggedWithLabelSet = Pipeable(taggedWithLabelSet_);
