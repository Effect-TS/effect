import * as Duration from "@fp-ts/data/Duration"
import * as HashSet from "@fp-ts/data/HashSet"

/**
 * Returns an aspect that will update this metric with the duration that the
 * effect takes to execute. To call this method, you must supply a function
 * that can convert the `Duration` to the input type of this metric.
 *
 * @tsplus static effect/core/io/Metrics/Metric.Aspects trackDurationWith
 * @tsplus pipeable effect/core/io/Metrics/Metric trackDurationWith
 * @category aspects
 * @since 1.0.0
 */
export function trackDurationWith<In>(f: (duration: Duration.Duration) => In) {
  return <Type, Out>(
    self: Metric<Type, In, Out>
  ): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A> => {
    return (effect) =>
      Effect.suspendSucceed(() => {
        const startTime = Date.now()
        return effect.map((a) => {
          const endTime = Date.now()
          const duration = Duration.millis(endTime - startTime)
          self.unsafeUpdate(f(duration), HashSet.empty())
          return a
        })
      })
  }
}
