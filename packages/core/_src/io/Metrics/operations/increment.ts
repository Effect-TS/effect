/**
 * @tsplus fluent ets/Metrics/Metric increment
 */
export function increment(self: Metric.Counter<number>, __tsplusTrace?: string): Effect<never, never, void> {
  return self.update(1)
}
