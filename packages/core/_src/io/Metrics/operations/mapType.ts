/**
 * @tsplus fluent ets/Metrics/Metric mapType
 */
export function mapType_<Type, Type2, In, Out>(
  self: Metric<Type, In, Out>,
  f: (type: Type) => Type2
): Metric<Type2, In, Out> {
  return Metric(
    f(self.keyType),
    self.unsafeUpdate,
    self.unsafeValue
  );
}

/**
 * @tsplus static ets/Metrics/Metric/Aspects mapType
 */
export const mapType = Pipeable(mapType_);
