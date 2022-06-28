/**
 * @tsplus static effect/core/io/Metrics/Metric.Aspects zip
 * @tsplus pipeable effect/core/io/Metrics/Metric zip
 */
export function zip<Type2, In2, Out2>(that: Metric<Type2, In2, Out2>) {
  return <Type, In, Out>(
    self: Metric<Type, In, Out>
  ): Metric<Tuple<[Type, Type2]>, Tuple<[In, In2]>, Tuple<[Out, Out2]>> =>
    Metric(
      Tuple(self.keyType, that.keyType),
      (input: Tuple<[In, In2]>, extraTags) => {
        const { tuple: [l, r] } = input
        self.unsafeUpdate(l, extraTags)
        that.unsafeUpdate(r, extraTags)
      },
      (extraTags) => Tuple(self.unsafeValue(extraTags), that.unsafeValue(extraTags))
    )
}
