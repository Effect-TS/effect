/**
 * Maps the output of this fiber to the specified constant value.
 *
 * @tsplus static effect/core/io/Fiber.Aspects as
 * @tsplus static effect/core/io/RuntimeFiber.Aspects as
 * @tsplus pipeable effect/core/io/Fiber as
 * @tsplus pipeable effect/core/io/RuntimeFiber as
 */
export function as<B>(b: LazyArg<B>) {
  return <E, A>(self: Fiber<E, A>): Fiber<E, B> => self.map(b)
}
