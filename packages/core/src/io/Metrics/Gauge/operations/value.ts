import type { UIO } from "../../../Effect"
import type { Gauge } from "../definition"
import { withGauge } from "./_internal/InternalGauge"

/**
 * Returns the current value of this gauge.
 *
 * @tsplus fluent ets/Gauge value
 */
export function value<A>(self: Gauge<A>, __tsplusTrace?: string): UIO<number> {
  return withGauge(self, (gauge) => gauge.value())
}
