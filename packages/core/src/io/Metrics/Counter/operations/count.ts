import type { UIO } from "../../../Effect"
import type { Counter } from "../definition"
import { withCounter } from "./_internal/InternalCounter"

/**
 * Returns the current value of this counter.
 *
 * @tsplus fluent ets/Counter count
 */
export function count<A>(self: Counter<A>, __tsplusTrace?: string): UIO<number> {
  return withCounter(self, (counter) => counter.count())
}
