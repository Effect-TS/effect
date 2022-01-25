import type { Effect, RIO } from "../definition"
import { chain_ } from "./chain"
import { orElse_ } from "./orElse"
import { yieldNow } from "./yieldNow"

/**
 * Returns an effect that ignores errors and runs repeatedly until it
 * eventually succeeds.
 *
 * @ets fluent ets/Effect eventually
 */
export function eventually<R, E, A>(
  self: Effect<R, E, A>,
  __etsTrace?: string
): RIO<R, A> {
  return orElse_(self, () => chain_(yieldNow, () => eventually(self)), __etsTrace)
}
