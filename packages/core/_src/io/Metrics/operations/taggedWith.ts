import { constVoid } from "@tsplus/stdlib/data/Function"

/**
 * Returns a new metric, which is identical in every way to this one, except
 * dynamic tags are added based on the update values. Note that the metric
 * returned by this method does not return any useful information, due to the
 * dynamic nature of the added tags.
 *
 * @tsplus fluent ets/Metrics/Metric taggedWith
 */
export function taggedWith_<Type, In, Out>(
  self: Metric<Type, In, Out>,
  f: (input: In) => HashSet<MetricLabel>
): Metric<Type, In, void> {
  return Metric<Type, In, Out>(
    self.keyType,
    (input, extraTags) => self.unsafeUpdate(input, f(input).union(extraTags)),
    self.unsafeValue
  ).map(constVoid)
}

/**
 * Returns a new metric, which is identical in every way to this one, except
 * dynamic tags are added based on the update values. Note that the metric
 * returned by this method does not return any useful information, due to the
 * dynamic nature of the added tags.
 *
 * @tsplus static ets/Metrics/Metric/Aspects taggedWith
 */
export const taggedWith = Pipeable(taggedWith_)
