import * as Trace from "../../../io/Trace"
import { Cause } from "../../Cause"
import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns an effect that dies with the specified `unknown`. This method can
 * be used for terminating a fiber because a defect has been detected in the
 * code.
 *
 * @tsplus static ets/EffectOps dieNow
 */
export function dieNow(defect: unknown, __tsplusTrace?: string): UIO<never> {
  return Effect.failCause(Cause.die(defect, Trace.none))
}
