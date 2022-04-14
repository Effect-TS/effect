/**
 * Returns a new metric, which is identical in every way to this one, except
 * the specified tags have been added to the tags of this metric.
 *
 * @tsplus fluent ets/Metrics/Metric taggedWithLabels
 */
export function taggedWithLabels_<Type, In, Out>(
  self: Metric<Type, In, Out>,
  extraTags: Collection<MetricLabel>
): Metric<Type, In, Out> {
  return self.taggedWithLabelSet(HashSet.from(extraTags));
}

/**
 * Returns a new metric, which is identical in every way to this one, except
 * the specified tags have been added to the tags of this metric.
 *
 * @tsplus static ets/Metrics/Metric/Aspects taggedWithLabels
 */
export const taggedWithLabels = Pipeable(taggedWithLabels_);
