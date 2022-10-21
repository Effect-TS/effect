/**
 * Zips this fiber and the specified fiber together, producing a tuple of
 * their output.
 *
 * @tsplus static effect/core/io/Fiber.Aspects zip
 * @tsplus static effect/core/io/RuntimeFiber.Aspects zip
 * @tsplus pipeable effect/core/io/Fiber zip
 * @tsplus pipeable effect/core/io/RuntimeFiber zip
 */
export function zip<E2, A2>(that: Fiber<E2, A2>) {
  return <E, A>(self: Fiber<E, A>): Fiber<E | E2, readonly [A, A2]> =>
    self.zipWith(
      that,
      (a, b) => [a, b] as const
    )
}
