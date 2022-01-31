import type { LazyArg } from "../../../data/Function"
import * as Cause from "../../Cause/definition"
import { Managed } from "../definition"

/**
 * Returns an effect that dies with the specified `Throwable`. This method can
 * be used for terminating a fiber because a defect has been detected in the
 * code.
 *
 * @ets static ets/ManagedOps die
 */
export function die(
  defect: LazyArg<unknown>,
  __etsTrace?: string
): Managed<unknown, never, never> {
  return Managed.failCause(Cause.die(defect))
}
