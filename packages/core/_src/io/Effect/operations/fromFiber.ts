/**
 * Creates an `Effect` value that represents the exit value of the specified
 * fiber.
 *
 * @tsplus static ets/Effect/Ops fromFiber
 */
export function fromFiber<E, A>(
  fiber: LazyArg<Fiber<E, A>>,
  __tsplusTrace?: string
): IO<E, A> {
  return Effect.succeed(fiber).flatMap((fiber) => fiber.join());
}
