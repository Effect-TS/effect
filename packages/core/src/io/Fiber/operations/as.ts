/**
 * Maps the output of this fiber to the specified constant value.
 *
 * @tsplus static effect/core/io/Fiber.Aspects as
 * @tsplus static effect/core/io/RuntimeFiber.Aspects as
 * @tsplus pipeable effect/core/io/Fiber as
 * @tsplus pipeable effect/core/io/RuntimeFiber as
 * @category mapping
 * @since 1.0.0
 */
export function as<B>(b: B) {
  return <E, A>(self: Fiber<E, A>): Fiber<E, B> => self.map(() => b)
}
