/**
 * Returns an aspect that will update this metric with the failure value of
 * the effects that it is applied to.
 *
 * @tsplus getter ets/Metrics/Metric trackError
 */
export function trackError<Type, In, Out>(self: Metric<Type, In, Out>) {
  return <R, E extends In, A>(effect: Effect<R, E, A>, __tsplusTrace?: string): Effect<R, E, A> =>
    self.trackErrorWith<Type, In, E, Out>(identity)(effect);
}
