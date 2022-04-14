/**
 * Returns an aspect that will update this metric with the specified constant
 * value every time the aspect is applied to an effect, regardless of whether
 * that effect fails or succeeds.
 *
 * @tsplus fluent ets/Metrics/Metric trackAll
 */
export function trackAll_<Type, In, Out>(self: Metric<Type, In, Out>, input: LazyArg<In>) {
  return <R, E, A>(effect: Effect<R, E, A>, __tsplusTrace?: string): Effect<R, E, A> =>
    effect.map((a) => {
      self.unsafeUpdate(input(), HashSet.empty());
      return a;
    });
}

/**
 * Returns an aspect that will update this metric with the specified constant
 * value every time the aspect is applied to an effect, regardless of whether
 * that effect fails or succeeds.
 *
 * @tsplus static ets/Metrics/Metric/Aspects trackAll
 */
export const trackAll = Pipeable(trackAll_);
