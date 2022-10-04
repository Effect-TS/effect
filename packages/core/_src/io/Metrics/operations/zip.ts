/**
 * @tsplus static effect/core/io/Metrics/Metric.Aspects zip
 * @tsplus pipeable effect/core/io/Metrics/Metric zip
 */
export function zip<Type2, In2, Out2>(that: Metric<Type2, In2, Out2>) {
  return <Type, In, Out>(
    self: Metric<Type, In, Out>
  ): Metric<readonly [Type, Type2], readonly [In, In2], readonly [Out, Out2]> =>
    Metric(
      [self.keyType, that.keyType] as const,
      (input: readonly [In, In2], extraTags) => {
        const [l, r] = input
        self.unsafeUpdate(l, extraTags)
        that.unsafeUpdate(r, extraTags)
      },
      (extraTags) => [self.unsafeValue(extraTags), that.unsafeValue(extraTags)] as const
    )
}
