/**
 * Returns a new metric that is powered by this one, but which accepts updates
 * of any type, and translates them to updates with the specified constant
 * update value.
 *
 * @tsplus fluent ets/Metrics/Metric fromConst
 */
export function fromConst_<Type, In, Out>(
  self: Metric<Type, In, Out>,
  input: LazyArg<In>
): Metric<Type, unknown, Out> {
  return self.contramap(input);
}

/**
 * Returns a new metric that is powered by this one, but which accepts updates
 * of any type, and translates them to updates with the specified constant
 * update value.
 *
 * @tsplus static ets/Metrics/Metric/Aspects fromConst
 */
export const fromConst = Pipeable(fromConst_);
