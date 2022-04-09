import { withGauge } from "@effect/core/io/Metrics/Gauge/operations/_internal/InternalGauge";

/**
 * Returns the current value of this gauge.
 *
 * @tsplus fluent ets/Gauge value
 */
export function value<A>(self: Gauge<A>, __tsplusTrace?: string): UIO<number> {
  return withGauge(self, (gauge) => gauge.value());
}
