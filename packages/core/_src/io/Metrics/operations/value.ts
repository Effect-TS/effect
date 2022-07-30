/**
 * Retrieves a snapshot of the value of the metric at this moment in time.
 *
 * @tsplus getter effect/core/io/Metrics/Metric value
 */
export function value<Type, In, Out>(self: Metric<Type, In, Out>, __tsplusTrace?: string): Effect<never, never, Out> {
  return Effect.sync(self.unsafeValue(HashSet.empty()))
}
