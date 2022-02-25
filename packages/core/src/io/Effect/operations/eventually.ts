import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns an effect that ignores errors and runs repeatedly until it
 * eventually succeeds.
 *
 * @tsplus fluent ets/Effect eventually
 */
export function eventually<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): RIO<R, A> {
  return self | (Effect.yieldNow > self.eventually())
}
