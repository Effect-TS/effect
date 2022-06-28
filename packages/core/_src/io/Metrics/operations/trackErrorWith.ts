/**
 * Returns an aspect that will update this metric with the result of applying
 * the specified function to the error value of the effects that the aspect is
 * applied to.
 *
 * @tsplus static effect/core/io/Metrics/Metric.Aspects trackErrorWith
 * @tsplus pipeable effect/core/io/Metrics/Metric trackErrorWith
 */
export function trackErrorWith<In, In2>(f: (error: In2) => In, __tsplusTrace?: string) {
  return <Type, Out>(
    self: Metric<Type, In, Out>
  ): <R, E extends In2, A>(effect: Effect<R, E, A>) => Effect<R, E, A> => {
    const updater = (error: In2): Effect<never, never, void> => self.update(f(error))
    return (effect) => effect.tapError(updater)
  }
}
