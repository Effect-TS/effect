/**
 * A fiber that has already succeeded with unit.
 *
 * @tsplus static effect/core/io/Fiber.Ops unit
 */
export const unit: Fiber<never, void> = Fiber.succeed(undefined)
