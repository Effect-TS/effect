/**
 * Returns an aspect that will update this metric with the result of applying
 * the specified function to the defect throwables of the effects that the
 * aspect is applied to.
 *
 * @tsplus fluent ets/Metrics/Metric trackDefectWith
 */
export function trackDefectWith_<Type, In, Out>(self: Metric<Type, In, Out>, f: (defect: unknown) => In) {
  const updater = (defect: unknown): void => self.unsafeUpdate(f(defect), HashSet.empty());
  return <R, E, A>(effect: Effect<R, E, A>, __tsplusTrace?: string): Effect<R, E, A> =>
    effect.tapDefect((cause) => Effect.succeed(cause.defects().forEach(updater)));
}

/**
 * Returns an aspect that will update this metric with the result of applying
 * the specified function to the defect throwables of the effects that the
 * aspect is applied to.
 *
 * @tsplus static ets/Metrics/Metric/Aspects trackDefectWith
 */
export const trackDefectWith = Pipeable(trackDefectWith_);
