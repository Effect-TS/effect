/**
 * Returns a new metric that is powered by this one, but which outputs a new
 * state type, determined by transforming the state type of this metric by the
 * specified function.
 *
 * @tsplus fluent ets/Metrics/Metric map
 */
export function map_<Type, In, Out, Out2>(
  self: Metric<Type, In, Out>,
  f: (out: Out) => Out2
): Metric<Type, In, Out2> {
  return Metric(
    self.keyType,
    self.unsafeUpdate,
    (extraTags) => f(self.unsafeValue(extraTags))
  )
}

/**
 * Returns a new metric that is powered by this one, but which outputs a new
 * state type, determined by transforming the state type of this metric by the
 * specified function.
 *
 * @tsplus static ets/Metrics/Metric/Aspects map
 */
export const map = Pipeable(map_)
