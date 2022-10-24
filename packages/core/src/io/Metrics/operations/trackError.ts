/**
 * Returns an aspect that will update this metric with the failure value of
 * the effects that it is applied to.
 *
 * @tsplus getter effect/core/io/Metrics/Metric trackError
 * @category aspects
 * @since 1.0.0
 */
export function trackError<Type, In, Out>(self: Metric<Type, In, Out>) {
  return <R, E extends In, A>(effect: Effect<R, E, A>): Effect<R, E, A> =>
    self.trackErrorWith((a: In) => a)(effect)
}
