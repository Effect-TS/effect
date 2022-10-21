/**
 * Returns a fiber that prefers `this` fiber, but falls back to the `that` one
 * when `this` one fails. Interrupting the returned fiber will interrupt both
 * fibers, sequentially, from left to right.
 *
 * @tsplus static effect/core/io/Fiber.Aspects orElseEither
 * @tsplus static effect/core/io/RuntimeFiber.Aspects orElseEither
 * @tsplus pipeable effect/core/io/Fiber orElseEither
 * @tsplus pipeable effect/core/io/RuntimeFiber orElseEither
 */
export function orElseEither<E2, A2>(that: LazyArg<Fiber<E2, A2>>) {
  return <E, A>(self: Fiber<E, A>): Fiber<E | E2, Either<A, A2>> =>
    self.map(Either.left).orElse(that().map(Either.right))
}
