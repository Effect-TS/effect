import { withGauge } from "@effect-ts/core/io/Metrics/Gauge/operations/_internal/InternalGauge";

/**
 * Sets this gauge to the specified value.
 *
 * @tsplus fluent ets/Gauge set
 */
export function set_<A>(
  self: Gauge<A>,
  value: number,
  __tsplusTrace?: string
): UIO<any> {
  return withGauge(self, (gauge) => gauge.set(value));
}

/**
 * Sets this gauge to the specified value.
 *
 * @tsplus static ets/Gauge/Aspects set
 */
export const set = Pipeable(set_);
