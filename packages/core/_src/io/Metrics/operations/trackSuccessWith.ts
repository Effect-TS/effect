/**
 * Returns an aspect that will update this metric with the result of applying
 * the specified function to the success value of the effects that the aspect is
 * applied to.
 *
 * @tsplus fluent ets/Metrics/Metric trackSuccessWith
 */
export function trackSuccessWith_<Type, In, In2, Out>(self: Metric<Type, In, Out>, f: (value: In2) => In) {
  const updater = (value: In2): Effect.UIO<void> => self.update(f(value));
  return <R, E, A extends In2>(effect: Effect<R, E, A>, __tsplusTrace?: string): Effect<R, E, A> => effect.tap(updater);
}

/**
 * Returns an aspect that will update this metric with the result of applying
 * the specified function to the success value of the effects that the aspect is
 * applied to.
 *
 * @tsplus static ets/Metrics/Metric/Aspects trackSuccessWith
 */
export const trackSuccessWith = Pipeable(trackSuccessWith_);
