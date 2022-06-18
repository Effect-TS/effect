/**
 * Returns an aspect that will update this metric with the result of applying
 * the specified function to the error value of the effects that the aspect is
 * applied to.
 *
 * @tsplus fluent ets/Metrics/Metric trackErrorWith
 */
export function trackErrorWith_<Type, In, In2, Out>(self: Metric<Type, In, Out>, f: (error: In2) => In) {
  const updater = (error: In2): Effect<never, never, void> => self.update(f(error))
  return <R, E extends In2, A>(effect: Effect<R, E, A>, __tsplusTrace?: string): Effect<R, E, A> =>
    effect.tapError(updater)
}

/**
 * Returns an aspect that will update this metric with the result of applying
 * the specified function to the error value of the effects that the aspect is
 * applied to.
 *
 * @tsplus static ets/Metrics/Metric/Aspects trackErrorWith
 */
export const trackErrorWith = Pipeable(trackErrorWith_)
