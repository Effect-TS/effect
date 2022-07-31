/**
 * Returns a new metric that is powered by this one, but which accepts updates
 * of any type, and translates them to updates with the specified constant
 * update value.
 *
 * @tsplus static effect/core/io/Metrics/Metric.Aspects fromConst
 * @tsplus pipeable effect/core/io/Metrics/Metric fromConst
 */
export function fromConst<In>(input: LazyArg<In>) {
  return <Type, Out>(self: Metric<Type, In, Out>): Metric<Type, unknown, Out> =>
    self.contramap(input)
}
