/**
 * Returns a new metric that is powered by this one, but which outputs a new
 * state type, determined by transforming the state type of this metric by the
 * specified function.
 *
 * @tsplus static effect/core/io/Metrics/Metric map
 * @tsplus pipeable effect/core/io/Metrics/Metric map
 */
export function map<Out, Out2>(f: (out: Out) => Out2) {
  return <Type, In>(self: Metric<Type, In, Out>): Metric<Type, In, Out2> =>
    Metric(
      self.keyType,
      self.unsafeUpdate,
      (extraTags) => f(self.unsafeValue(extraTags))
    )
}
