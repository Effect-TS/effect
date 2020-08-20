import { Interrupt } from "../Cause/cause"
import type { FiberID } from "../Fiber/id"
import { halt } from "./core"

/**
 * Returns an effect that is interrupted as if by the specified fiber.
 */
export const interruptAs = (fiberId: FiberID) => halt(Interrupt(fiberId))
