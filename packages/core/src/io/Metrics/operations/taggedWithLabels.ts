import * as HashSet from "@fp-ts/data/HashSet"

/**
 * Returns a new metric, which is identical in every way to this one, except
 * the specified tags have been added to the tags of this metric.
 *
 * @tsplus static effect/core/io/Metrics/Metric.Aspects taggedWithLabels
 * @tsplus pipeable effect/core/io/Metrics/Metric taggedWithLabels
 * @category mutations
 * @since 1.0.0
 */
export function taggedWithLabels<Type, In, Out>(extraTags: Iterable<MetricLabel>) {
  return (self: Metric<Type, In, Out>): Metric<Type, In, Out> =>
    self.taggedWithLabelSet(HashSet.from(extraTags))
}
