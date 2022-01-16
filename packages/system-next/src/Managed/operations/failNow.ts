// ets_tracing: off

import * as Cause from "../../Cause/definition"
import type { Managed } from "../definition"
import { failCause } from "./failCause"

/**
 * Returns an effect that models failure with the specified error. The moral
 * equivalent of `throw` for pure code.
 */
export function failNow<E>(error: E, __trace?: string): Managed<unknown, E, never> {
  return failCause(Cause.fail(error), __trace)
}
