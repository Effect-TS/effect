/**
 * Updates the metric with the specified update message. For example, if the
 * metric were a counter, the update would increment the method by the
 * provided amount.
 *
 * @tsplus fluent ets/Metrics/Metric update
 */
export function update_<Type, In, Out>(
  self: Metric<Type, In, Out>,
  input: LazyArg<In>,
  __tsplusTrace?: string
): Effect.UIO<void> {
  return Effect.succeed(self.unsafeUpdate(input(), HashSet.empty()))
}

/**
 * Updates the metric with the specified update message. For example, if the
 * metric were a counter, the update would increment the method by the
 * provided amount.
 *
 * @tsplus static ets/Metrics/Metric/Aspects update
 */
export const update = Pipeable(update_)
