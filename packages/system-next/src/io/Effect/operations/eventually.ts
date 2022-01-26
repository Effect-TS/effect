import type { Effect, RIO } from "../definition"
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
  return self | yieldNow.flatMap(() => self.eventually())
}
