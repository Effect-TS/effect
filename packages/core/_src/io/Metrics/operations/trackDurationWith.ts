/**
 * Returns an aspect that will update this metric with the duration that the
 * effect takes to execute. To call this method, you must supply a function
 * that can convert the `Duration` to the input type of this metric.
 *
 * @tsplus static effect/core/io/Metrics/Metric.Aspects trackDurationWith
 * @tsplus pipeable effect/core/io/Metrics/Metric trackDurationWith
 */
export function trackDurationWith<In>(f: (duration: Duration) => In) {
  return <Type, Out>(
    self: Metric<Type, In, Out>
  ): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A> => {
    return (effect) =>
      Effect.suspendSucceed(() => {
        const startTime = Date.now()
        return effect.map((a) => {
          const endTime = Date.now()
          const duration = new Duration(endTime - startTime)
          self.unsafeUpdate(f(duration), HashSet.empty())
          return a
        })
      })
  }
}
