/**
 * Returns an aspect that will update this metric with the result of applying
 * the specified function to the success value of the effects that the aspect is
 * applied to.
 *
 * @tsplus static effect/core/io/Metrics/Metric.Aspects trackSuccessWith
 * @tsplus pipeable effect/core/io/Metrics/Metric trackSuccessWith
 * @category aspects
 * @since 1.0.0
 */
export function trackSuccessWith<In, In2>(f: (value: In2) => In) {
  return <Type, Out>(
    self: Metric<Type, In, Out>
  ): <R, E, A extends In2>(effect: Effect<R, E, A>) => Effect<R, E, A> => {
    const updater = (value: In2): Effect<never, never, void> => self.update(f(value))
    return (effect) => effect.tap(updater)
  }
}
