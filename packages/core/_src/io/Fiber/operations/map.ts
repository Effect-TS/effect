/**
 * Maps over the value the Fiber computes.
 *
 * @tsplus static effect/core/io/Fiber.Aspects map
 * @tsplus static effect/core/io/RuntimeFiber.Aspects map
 * @tsplus pipeable effect/core/io/Fiber map
 * @tsplus pipeable effect/core/io/RuntimeFiber map
 */
export function map<A, B>(f: (a: A) => B) {
  return <E>(self: Fiber<E, A>): Fiber<E, B> =>
    self.mapEffect(
      (a) => Effect.sync(f(a))
    )
}
