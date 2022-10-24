/**
 * Same as `zip` but discards the output of the left hand side.
 *
 * @tsplus pipeable-operator effect/core/io/Fiber >
 * @tsplus pipeable-operator effect/core/io/RuntimeFiber >
 * @tsplus static effect/core/io/Fiber.Aspects zipRight
 * @tsplus static effect/core/io/RuntimeFiber.Aspects zipRight
 * @tsplus pipeable effect/core/io/Fiber zipRight
 * @tsplus pipeable effect/core/io/RuntimeFiber zipRight
 * @category zipping
 * @since 1.0.0
 */
export function zipRight<E2, A2>(that: Fiber<E2, A2>) {
  return <E, A>(self: Fiber<E, A>): Fiber<E | E2, A2> =>
    self.zipWith(
      that,
      (_, b) => b
    )
}
