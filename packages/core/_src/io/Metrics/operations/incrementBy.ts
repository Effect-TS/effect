/**
 * @tsplus fluent ets/Metrics/Metric incrementBy
 */
export function incrementBy_(
  self: Metric.Counter<number>,
  amount: LazyArg<number>,
  __tsplusTrace?: string
): UIO<void> {
  return self.update(amount);
}

/**
 * @tsplus static ets/Metrics/Metric/Aspects incrementBy
 */
export const incrementBy = Pipeable(incrementBy_);
