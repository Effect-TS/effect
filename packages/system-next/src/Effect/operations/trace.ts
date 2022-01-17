import type { Trace } from "../../Trace"
import type { UIO } from "../definition"
import { ITrace } from "../definition"

/**
 * Capture the trace at the current point.
 */
export function trace(__trace?: string): UIO<Trace> {
  return new ITrace(__trace)
}
