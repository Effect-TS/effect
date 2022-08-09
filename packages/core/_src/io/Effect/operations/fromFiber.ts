/**
 * Creates an `Effect` value that represents the exit value of the specified
 * fiber.
 *
 * @tsplus static effect/core/io/Effect.Ops fromFiber
 */
export function fromFiber<E, A>(fiber: Fiber<E, A>): Effect<never, E, A> {
  return Effect.sync(fiber).flatMap((fiber) => fiber.join)
}
