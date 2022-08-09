/**
 * @tsplus static effect/core/io/Metrics/Metric.Aspects incrementBy
 * @tsplus pipeable effect/core/io/Metrics/Metric incrementBy
 */
export function incrementBy(amount: number) {
  return (self: Metric.Counter<number>): Effect<never, never, void> => self.update(amount)
}
