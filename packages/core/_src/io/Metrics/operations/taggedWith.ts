import { constVoid } from "@tsplus/stdlib/data/Function"

/**
 * Returns a new metric, which is identical in every way to this one, except
 * dynamic tags are added based on the update values. Note that the metric
 * returned by this method does not return any useful information, due to the
 * dynamic nature of the added tags.
 *
 * @tsplus static effect/core/io/Metrics/Metric.Aspects taggedWith
 * @tsplus pipeable effect/core/io/Metrics/Metric taggedWith
 */
export function taggedWith<In>(f: (input: In) => HashSet<MetricLabel>) {
  return <Type, Out>(self: Metric<Type, In, Out>): Metric<Type, In, void> =>
    Metric<Type, In, Out>(
      self.keyType,
      (input, extraTags) => self.unsafeUpdate(input, f(input).union(extraTags)),
      self.unsafeValue
    ).map(constVoid)
}
