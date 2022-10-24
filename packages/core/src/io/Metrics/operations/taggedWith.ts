import { constVoid, pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"

/**
 * Returns a new metric, which is identical in every way to this one, except
 * dynamic tags are added based on the update values. Note that the metric
 * returned by this method does not return any useful information, due to the
 * dynamic nature of the added tags.
 *
 * @tsplus static effect/core/io/Metrics/Metric.Aspects taggedWith
 * @tsplus pipeable effect/core/io/Metrics/Metric taggedWith
 * @category mutations
 * @since 1.0.0
 */
export function taggedWith<In>(f: (input: In) => HashSet.HashSet<MetricLabel>) {
  return <Type, Out>(self: Metric<Type, In, Out>): Metric<Type, In, void> =>
    Metric<Type, In, Out>(
      self.keyType,
      (input, extraTags) => self.unsafeUpdate(input, pipe(f(input), HashSet.union(extraTags))),
      self.unsafeValue
    ).map(constVoid)
}
