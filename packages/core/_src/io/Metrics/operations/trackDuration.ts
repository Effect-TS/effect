/**
 * Returns an aspect that will update this metric with the duration that the
 * effect takes to execute. To call this method, the input type of the metric
 * must be `Duration`.
 *
 * @tsplus getter effect/core/io/Metrics/Metric trackDuration
 */
export function trackDuration<Type, Out>(
  self: Metric<Type, Duration, Out>,
  __tsplusTrace?: string
): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A> {
  return self.trackDurationWith(identity)
}
