import type { HasClock } from "../../Clock"
import { sleep as clockSleep } from "../../Clock"
import type { RIO } from "../definition"

/**
 * Returns an effect that suspends for the specified duration. This method is
 * asynchronous, and does not actually block the fiber executing the effect.
 *
 * @ets static ets/EffectOps sleep
 */
export function sleep(milliseconds: number, __trace?: string): RIO<HasClock, void> {
  return clockSleep(milliseconds, __trace)
}
