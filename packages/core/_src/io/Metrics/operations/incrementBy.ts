/**
 * @tsplus static effect/core/io/Metrics/Metric.Aspects incrementBy
 * @tsplus pipeable effect/core/io/Metrics/Metric incrementBy
 */
export function incrementBy(amount: LazyArg<number>, __tsplusTrace?: string) {
  return (self: Metric.Counter<number>): Effect<never, never, void> => self.update(amount)
}
