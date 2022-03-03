import type { UIO } from "../../../Effect"
import type { Gauge } from "../definition"
import { withGauge } from "./_internal/InternalGauge"

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
  return withGauge(self, (gauge) => gauge.adjust(value))
}

/**
 * Adjusts this gauge by the specified amount.
 *
 * @ets_data_first adjust_
 */
export function adjust(value: number, __tsplusTrace?: string) {
  return <A>(self: Gauge<A>): UIO<any> => self.adjust(value)
}
