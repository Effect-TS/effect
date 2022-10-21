/**
 * Returns a new metric that is powered by this one, but which accepts updates
 * of the specified new type, which must be transformable to the input type of
 * this metric.
 *
 * @tsplus static effect/core/io/Metrics/Metric.Aspects contramap
 * @tsplus pipeable effect/core/io/Metrics/Metric contramap
 */
export function contramap<In, In2>(f: (input: In2) => In) {
  return <Type, Out>(self: Metric<Type, In, Out>): Metric<Type, In2, Out> =>
    Metric(
      self.keyType,
      (input, extraTags) => self.unsafeUpdate(f(input), extraTags),
      self.unsafeValue
    )
}
