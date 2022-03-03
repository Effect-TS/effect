import type { UIO } from "../../../Effect"
import type { SetCount } from "../definition"
import { withSetCount } from "./_internal/InternalSetCount"

/**
 * Increments the counter associated with the specified value by one.
 *
 * @tsplus fluent ets/SetCount observe
 */
export function observe_<A>(
  self: SetCount<A>,
  value: string,
  __tsplusTrace?: string
): UIO<unknown> {
  return withSetCount(self, (setCount) => setCount.observe(value))
}

/**
 * Increments the counter associated with the specified value by one.
 *
 * @ets_data_first observe_
 */
export function observe(value: string, __tsplusTrace?: string) {
  return <A>(self: SetCount<A>): UIO<unknown> => self.observe(value)
}
