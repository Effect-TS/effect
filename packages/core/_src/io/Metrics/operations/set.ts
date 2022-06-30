/**
 * @tsplus static effect/core/io/Metrics/Metric.Aspects set
 * @tsplus pipeable effect/core/io/Metrics/Metric set
 */
export function set<In>(value: LazyArg<In>, __tsplusTrace?: string) {
  return (self: Metric.Gauge<In>): Effect<never, never, void> => self.update(value)
}
