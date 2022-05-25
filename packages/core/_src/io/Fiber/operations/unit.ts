/**
 * A fiber that has already succeeded with unit.
 *
 * @tsplus static ets/Fiber/Ops unit
 */
export const unit: Fiber<never, void> = Fiber.succeed(undefined)
