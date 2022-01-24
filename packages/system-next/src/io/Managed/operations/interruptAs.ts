import * as Cause from "../../Cause/definition"
import type { FiberId } from "../../FiberId/definition"
import type { Managed } from "../definition"
import { failCause } from "./failCause"

/**
 * Returns an effect that is interrupted as if by the specified fiber.
 */
export function interruptAs(
  fiberId: FiberId,
  __trace?: string
): Managed<unknown, never, never> {
  return failCause(Cause.interrupt(fiberId), __trace)
}
