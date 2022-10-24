import * as HashSet from "@fp-ts/data/HashSet"

/**
 * Updates the metric with the specified update message. For example, if the
 * metric were a counter, the update would increment the method by the
 * provided amount.
 *
 * @tsplus static effect/core/io/Metrics/Metric.Aspects update
 * @tsplus pipeable effect/core/io/Metrics/Metric update
 * @category mutations
 * @since 1.0.0
 */
export function update<In>(input: In) {
  return <Type, Out>(self: Metric<Type, In, Out>): Effect<never, never, void> =>
    Effect.sync(self.unsafeUpdate(input, HashSet.empty()))
}
