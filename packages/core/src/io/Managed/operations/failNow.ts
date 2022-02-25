import * as Cause from "../../Cause/definition"
import { Managed } from "../definition"

/**
 * Returns an effect that models failure with the specified error. The moral
 * equivalent of `throw` for pure code.
 *
 * @tsplus static ets/ManagedOps failNow
 */
export function failNow<E>(
  error: E,
  __tsplusTrace?: string
): Managed<unknown, E, never> {
  return Managed.failCauseNow(Cause.fail(error))
}
