/**
 * @tsplus getter effect/core/io/Metrics/Metric increment
 */
export function increment(self: Metric.Counter<number>): Effect<never, never, void> {
  return self.update(1)
}
