/**
 * @tsplus getter effect/core/io/Metrics/Metric increment
 * @category aspects
 * @since 1.0.0
 */
export function increment(self: Metric.Counter<number>): Effect<never, never, void> {
  return self.update(1)
}
