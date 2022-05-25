/**
 * Returns a new metric, which is identical in every way to this one, except
 * the specified tags have been added to the tags of this metric.
 *
 * @tsplus fluent ets/Metrics/Metric tagged
 */
export function tagged_<Type, In, Out>(
  self: Metric<Type, In, Out>,
  key: string,
  value: string
): Metric<Type, In, Out> {
  return self.taggedWithLabelSet(HashSet(MetricLabel(key, value)))
}

/**
 * Returns a new metric, which is identical in every way to this one, except
 * the specified tags have been added to the tags of this metric.
 *
 * @tsplus static ets/Metrics/Metric/Aspects tagged
 */
export const tagged = Pipeable(tagged_)
