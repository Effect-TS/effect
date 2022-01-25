import * as Trace from "../../../io/Trace"
import * as Cause from "../../Cause"
import type { UIO } from "../definition"
import { failCause } from "./failCause"

// TODO(Mike/Max): fix name

/**
 * Returns an effect that dies with the specified `unknown`. This method can
 * be used for terminating a fiber because a defect has been detected in the
 * code.
 *
 * @ets static ets/EffectOps dieNow
 */
export function die(defect: unknown, __etsTrace?: string): UIO<never> {
  return failCause(Cause.die(defect, Trace.none), __etsTrace)
}
