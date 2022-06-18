/**
 * @tsplus fluent ets/Metrics/Metric set
 */
export function set_<In>(
  self: Metric.Gauge<In>,
  value: LazyArg<In>,
  __tsplusTrace?: string
): Effect<never, never, void> {
  return self.update(value)
}

/**
 * @tsplus static ets/Metrics/Metric/Aspects set
 */
export const set = Pipeable(set_)
