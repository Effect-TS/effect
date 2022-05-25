/**
 * Returns an aspect that will update this metric with the defects of the
 * effects that it is applied to.
 *
 * @tsplus getter ets/Metrics/Metric trackDefect
 */
export function trackDefect<Type, Out>(
  self: Metric<Type, unknown, Out>
): <R, E, A>(effect: Effect<R, E, A>, __tsplusTrace?: string) => Effect<R, E, A> {
  return self.trackDefectWith(identity)
}
