/**
 * Returns a new metric that is powered by this one, but which accepts updates
 * of the specified new type, which must be transformable to the input type of
 * this metric.
 *
 * @tsplus fluent ets/Metrics/Metric contramap
 */
export function contramap_<Type, In, In2, Out>(
  self: Metric<Type, In, Out>,
  f: (input: In2) => In,
  __tsplusTrace?: string
): Metric<Type, In2, Out> {
  return new Metric(
    self.keyType,
    (input, extraTags) => self.unsafeUpdate(f(input), extraTags),
    self.unsafeValue
  );
}

/**
 * Returns a new metric that is powered by this one, but which accepts updates
 * of the specified new type, which must be transformable to the input type of
 * this metric.
 *
 * @tsplus fluent ets/Metrics/Metric/Aspects contramap
 */
export const contramap = Pipeable(contramap_);
