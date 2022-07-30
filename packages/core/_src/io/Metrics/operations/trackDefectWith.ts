/**
 * Returns an aspect that will update this metric with the result of applying
 * the specified function to the defect throwables of the effects that the
 * aspect is applied to.
 *
 * @tsplus static effect/core/io/Metrics/Metric.Aspects trackDefectWith
 * @tsplus pipeable effect/core/io/Metrics/Metric trackDefectWith
 */
export function trackDefectWith<In>(f: (defect: unknown) => In, __tsplusTrace?: string) {
  return <Type, Out>(
    self: Metric<Type, In, Out>
  ): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A> => {
    const updater = (defect: unknown): void => self.unsafeUpdate(f(defect), HashSet.empty())
    return (effect) => effect.tapDefect((cause) => Effect.sync(cause.defects.forEach(updater)))
  }
}
