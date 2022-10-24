/**
 * A fiber that has already succeeded with unit.
 *
 * @tsplus static effect/core/io/Fiber.Ops unit
 * @category constructors
 * @since 1.0.0
 */
export const unit: Fiber<never, void> = Fiber.succeed(undefined)
