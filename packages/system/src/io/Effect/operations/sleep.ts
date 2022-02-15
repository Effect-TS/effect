import { HasClock } from "../../Clock"
import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns an effect that suspends for the specified duration. This method is
 * asynchronous, and does not actually block the fiber executing the effect.
 *
 * @tsplus static ets/EffectOps sleep
 */
export function sleep(milliseconds: number, __etsTrace?: string): RIO<HasClock, void> {
  return Effect.serviceWithEffect(HasClock)((_) => _.sleep(milliseconds))
}
