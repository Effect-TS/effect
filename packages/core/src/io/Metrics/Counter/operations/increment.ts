import type { UIO } from "../../../Effect"
import type { Counter } from "../definition"
import { withCounter } from "./_internal/InternalCounter"

/**
 * Increments this counter by the specified amount.
 *
 * @tsplus fluent ets/Counter increment
 */
export function increment_<A>(
  self: Counter<A>,
  value = 1,
  __tsplusTrace?: string
): UIO<void> {
  return withCounter(self, (counter) => counter.increment(value)).asUnit()
}

/**
 * Increments this counter by the specified amount.
 *
 * @ets_data_first increment_
 */
export function increment(value = 1, __tsplusTrace?: string) {
  return <A>(self: Counter<A>): UIO<void> => self.increment(value)
}
