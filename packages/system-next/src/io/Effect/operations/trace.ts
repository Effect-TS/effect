import type { Trace } from "../../../io/Trace"
import type { UIO } from "../definition"
import { ITrace } from "../definition"

/**
 * Capture the trace at the current point.
 *
 * @ets static ets/EffectOps trace
 */
export function trace(__trace?: string): UIO<Trace> {
  return new ITrace(__trace)
}
