import * as HashSet from "@fp-ts/data/HashSet"

/**
 * Retrieves a snapshot of the value of the metric at this moment in time.
 *
 * @tsplus getter effect/core/io/Metrics/Metric value
 * @category getters
 * @since 1.0.0
 */
export function value<Type, In, Out>(
  self: Metric<Type, In, Out>
): Effect<never, never, Out> {
  return Effect.sync(self.unsafeValue(HashSet.empty()))
}
