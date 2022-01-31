import type { Trace } from "../../../io/Trace"
import type { UIO } from "../definition"
import { ITrace } from "../definition"

/**
 * Capture the trace at the current point.
 *
 * @tsplus static ets/EffectOps trace
 */
export function trace(__etsTrace?: string): UIO<Trace> {
  return new ITrace(__etsTrace)
}
