import * as HashSet from "@fp-ts/data/HashSet"

/**
 * Returns an aspect that will update this metric with the specified constant
 * value every time the aspect is applied to an effect, regardless of whether
 * that effect fails or succeeds.
 *
 * @tsplus static effect/core/io/Metrics/Metric.Aspects trackAll
 * @tsplus pipeable effect/core/io/Metrics/Metric trackAll
 * @category aspects
 * @since 1.0.0
 */
export function trackAll<In>(input: In) {
  return <Type, Out>(
    self: Metric<Type, In, Out>
  ): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A> => {
    return (effect) =>
      effect.map((a) => {
        self.unsafeUpdate(input, HashSet.empty())
        return a
      })
  }
}
