/**
 * Returns an aspect that will update this metric with the success value of
 * the effects that it is applied to.
 *
 * @tsplus getter ets/Metrics/Metric trackSuccess
 */
export function trackSuccess<Type, In, Out>(self: Metric<Type, In, Out>) {
  return <R, E, A extends In>(effect: Effect<R, E, A>, __tsplusTrace?: string): Effect<R, E, A> =>
    self.trackSuccessWith<Type, In, A, Out>(identity)(effect)
}
