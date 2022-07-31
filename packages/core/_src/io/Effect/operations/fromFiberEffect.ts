/**
 * Creates an `Effect` value that represents the exit value of the specified
 * fiber.
 *
 * @tsplus static effect/core/io/Effect.Ops fromFiberEffect
 */
export function fromFiberEffect<R, E, A>(
  fiber: LazyArg<Effect<R, E, Fiber<E, A>>>
): Effect<R, E, A> {
  return Effect.suspendSucceed(fiber().flatMap((fiber) => fiber.join))
}
