/**
 * Passes the success of this fiber to the specified callback, and continues
 * with the fiber that it returns.
 *
 * @tsplus static effect/core/io/Fiber.Aspects mapFiber
 * @tsplus static effect/core/io/RuntimeFiber.Aspects mapFiber
 * @tsplus pipeable effect/core/io/RuntimeFiber mapFiber
 * @tsplus pipeable effect/core/io/RuntimeFiber mapFiber
 */
export function mapFiber<E, E1, A, B>(
  f: (a: A) => Fiber<E1, B>
) {
  return (self: Fiber<E, A>): Effect<never, never, Fiber<E | E1, B>> =>
    self.await.map((exit) =>
      exit.fold(
        (cause): Fiber<E | E1, B> => Fiber.failCause(cause),
        (a) => f(a)
      )
    )
}
