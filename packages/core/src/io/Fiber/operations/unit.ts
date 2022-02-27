import { Fiber } from "../definition"

/**
 * A fiber that has already succeeded with unit.
 *
 * @tsplus static ets/FiberOps unit
 */
export const unit: Fiber<never, void> = Fiber.succeed(undefined)
