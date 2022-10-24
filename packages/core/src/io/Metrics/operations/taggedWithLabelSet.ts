import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"

/**
 * Returns a new metric, which is identical in every way to this one, except
 * the specified tags have been added to the tags of this metric.
 *
 * @tsplus static effect/core/io/Metrics/Metric.Aspects taggedWithLabelSet
 * @tsplus pipeable effect/core/io/Metrics/Metric taggedWithLabelSet
 * @category mutations
 * @since 1.0.0
 */
export function taggedWithLabelSet(extraTags: HashSet.HashSet<MetricLabel>) {
  return <Type, In, Out>(self: Metric<Type, In, Out>): Metric<Type, In, Out> =>
    Metric(
      self.keyType,
      (input, extraTags1) => self.unsafeUpdate(input, pipe(extraTags, HashSet.union(extraTags1))),
      (extraTags1) => self.unsafeValue(pipe(extraTags, HashSet.union(extraTags1)))
    )
}
