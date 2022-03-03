import type { UIO } from "../../../Effect"
import type { Gauge } from "../definition"
import { withGauge } from "./_internal/InternalGauge"

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
  return withGauge(self, (gauge) => gauge.set(value))
}

/**
 * Sets this gauge to the specified value.
 *
 * @ets_data_first set_
 */
export function set(value: number, __tsplusTrace?: string) {
  return <A>(self: Gauge<A>): UIO<any> => self.set(value)
}
