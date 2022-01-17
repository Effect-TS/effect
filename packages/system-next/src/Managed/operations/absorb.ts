import type { Managed } from "../definition"
import { absorbWith_ } from "./absorbWith"

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 */
export function absorb<R, E, A>(
  self: Managed<R, E, A>,
  f: (e: E) => unknown,
  __trace?: string
): Managed<R, unknown, A> {
  return absorbWith_(self, f, __trace)
}
