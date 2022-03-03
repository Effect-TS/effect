import type { UIO } from "../../../Effect"
import type { Summary } from "../definition"
import { withSummary } from "./_internal/InternalSummary"

/**
 * Adds the specified value to the time series represented by this summary,
 * also recording the `Instant` when the value was observed.
 *
 * @tsplus fluent ets/Summary observe
 */
export function observe_<A>(
  self: Summary<A>,
  value: number,
  __tsplusTrace?: string
): UIO<unknown> {
  return withSummary(self, (summary) => summary.observe(value))
}

/**
 * Adds the specified value to the time series represented by this summary,
 * also recording the `Instant` when the value was observed.
 *
 * @ets_data_first observe
 */
export function observe(value: number, __tsplusTrace?: string) {
  return <A>(self: Summary<A>): UIO<unknown> => self.observe(value)
}
