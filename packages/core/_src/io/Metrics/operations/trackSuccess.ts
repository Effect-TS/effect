/**
 * Returns an aspect that will update this metric with the success value of
 * the effects that it is applied to.
 *
 * @tsplus getter effect/core/io/Metrics/Metric trackSuccess
 */
export function trackSuccess<Type, In, Out>(self: Metric<Type, In, Out>) {
  return <R, E, A extends In>(effect: Effect<R, E, A>): Effect<R, E, A> =>
    self.trackSuccessWith((a: In) => a)(effect)
}
