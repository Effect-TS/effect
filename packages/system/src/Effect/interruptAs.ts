import { interrupt, traced } from "../Cause/cause"
import type { FiberID } from "../Fiber/id"
import { haltWith } from "./core"

/**
 * Returns an effect that is interrupted as if by the specified fiber.
 */
export function interruptAs(fiberId: FiberID) {
  return haltWith((trace) => traced(interrupt(fiberId), trace()))
}
