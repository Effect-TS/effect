/**
 * Creates an `Effect` value that represents the exit value of the specified
 * fiber.
 *
 * @tsplus static effect/core/io/Effect.Ops fromFiber
 * @category conversions
 * @since 1.0.0
 */
export function fromFiber<E, A>(fiber: Fiber<E, A>): Effect<never, E, A> {
  return fiber.join
}
