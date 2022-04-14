/**
 * Returns an aspect that will update this metric with the duration that the
 * effect takes to execute. To call this method, you must supply a function
 * that can convert the `Duration` to the input type of this metric.
 *
 * @tsplus fluent ets/Metrics/Metric trackDurationWith
 */
export function trackDurationWith_<Type, In, Out>(self: Metric<Type, In, Out>, f: (duration: Duration) => In) {
  return <R, E, A>(effect: Effect<R, E, A>, __tsplusTrace?: string): Effect<R, E, A> =>
    Effect.suspendSucceed(() => {
      const startTime = Date.now();
      return effect.map((a) => {
        const endTime = Date.now();
        const duration = new Duration(endTime - startTime);
        self.unsafeUpdate(f(duration), HashSet.empty());
        return a;
      });
    });
}

/**
 * Returns an aspect that will update this metric with the duration that the
 * effect takes to execute. To call this method, you must supply a function
 * that can convert the `Duration` to the input type of this metric.
 *
 * @tsplus static ets/Metrics/Metric/Aspects trackDurationWith
 */
export const trackDurationWith = Pipeable(trackDurationWith_);
