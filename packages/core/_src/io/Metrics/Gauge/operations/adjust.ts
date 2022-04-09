import { withGauge } from "@effect/core/io/Metrics/Gauge/operations/_internal/InternalGauge";

/**
 * Adjusts this gauge by the specified amount.
 *
 * @tsplus fluent ets/Gauge adjust
 */
export function adjust_<A>(
  self: Gauge<A>,
  value: number,
  __tsplusTrace?: string
): UIO<any> {
  return withGauge(self, (gauge) => gauge.adjust(value));
}

/**
 * Adjusts this gauge by the specified amount.
 *
 * @tsplus static ets/Gauge/Aspects adjust
 */
export const adjust = Pipeable(adjust_);
