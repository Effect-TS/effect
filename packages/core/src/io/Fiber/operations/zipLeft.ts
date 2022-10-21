/**
 * Same as `zip` but discards the output of the right hand side.
 *
 * @tsplus pipeable-operator effect/core/io/Fiber <
 * @tsplus pipeable-operator effect/core/io/RuntimeFiber <
 * @tsplus static effect/core/io/Fiber.Aspects zipLeft
 * @tsplus static effect/core/io/RuntimeFiber.Aspects zipLeft
 * @tsplus pipeable effect/core/io/Fiber zipLeft
 * @tsplus pipeable effect/core/io/RuntimeFiber zipLeft
 */
export function zipLeft<E2, A2>(that: Fiber<E2, A2>) {
  return <E, A>(self: Fiber<E, A>): Fiber<E | E2, A> =>
    self.zipWith(
      that,
      (a, _) => a
    )
}
