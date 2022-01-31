import * as Cause from "../../Cause"
import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns an effect that dies with a `RuntimeException` having the specified
 * text message. This method can be used for terminating a fiber because a
 * defect has been detected in the code.
 *
 * @ets static ets/EffectOps dieMessage
 */
export function dieMessage(message: string, __etsTrace?: string): UIO<never> {
  return Effect.failCauseNow(
    Cause.stackless(Cause.die(new Cause.RuntimeError(message)))
  )
}
