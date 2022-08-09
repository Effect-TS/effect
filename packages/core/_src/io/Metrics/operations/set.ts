/**
 * @tsplus static effect/core/io/Metrics/Metric.Aspects set
 * @tsplus pipeable effect/core/io/Metrics/Metric set
 */
export function set<In>(value: In) {
  return (self: Metric.Gauge<In>): Effect<never, never, void> => self.update(value)
}
