import type { Effect, RIO } from "../definition"
import { chain_ } from "./chain"
import { orElse_ } from "./orElse"
import { yieldNow } from "./yieldNow"

/**
 * Returns an effect that ignores errors and runs repeatedly until it
 * eventually succeeds.
 */
export function eventually<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): RIO<R, A> {
  return orElse_(self, () => chain_(yieldNow, () => eventually(self)), __trace)
}
