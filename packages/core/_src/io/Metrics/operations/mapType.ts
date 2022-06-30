/**
 * @tsplus static effect/core/io/Metrics/Metric.Aspects mapType
 * @tsplus pipeable effect/core/io/Metrics/Metric mapType
 */
export function mapType<Type, Type2>(f: (type: Type) => Type2, __tsplusTrace?: string) {
  return <In, Out>(self: Metric<Type, In, Out>): Metric<Type2, In, Out> =>
    Metric(
      f(self.keyType),
      self.unsafeUpdate,
      self.unsafeValue
    )
}
