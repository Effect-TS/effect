import type { LazyArg } from "../../../data/Function"
import * as Cause from "../../Cause/definition"
import type { FiberId } from "../../FiberId/definition"
import { Managed } from "../definition"

/**
 * Returns an effect that is interrupted as if by the specified fiber.
 *
 * @tsplus static ets/ManagedOps interruptAs
 */
export function interruptAs(
  fiberId: LazyArg<FiberId>,
  __tsplusTrace?: string
): Managed<unknown, never, never> {
  return Managed.failCause(Cause.interrupt(fiberId()))
}
