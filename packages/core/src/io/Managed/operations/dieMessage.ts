import type { LazyArg } from "../../../data/Function"
import { RuntimeError } from "../../Cause/errors"
import { Managed } from "../definition"

/**
 * Returns an effect that dies with a `RuntimeError` having the specified text
 * message. This method can be used for terminating a fiber because a defect
 * has been detected in the code.
 *
 * @tsplus static ets/ManagedOps dieMessage
 */
export function dieMessage(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Managed<unknown, never, never> {
  return Managed.die(new RuntimeError(message()))
}
