/**
 * Retrieves a snapshot of the value of the metric at this moment in time.
 *
 * @tsplus fluent ets/Metrics/Metric value
 */
export function value<Type, In, Out>(self: Metric<Type, In, Out>, __tsplusTrace?: string): UIO<Out> {
  return Effect.succeed(self.unsafeValue(HashSet.empty()));
}
