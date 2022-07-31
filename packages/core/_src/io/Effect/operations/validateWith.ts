/**
 * Sequentially zips this effect with the specified effect using the specified
 * combiner function. Combines the causes in case both effect fail.
 *
 * @tsplus static effect/core/io/Effect.Aspects validateWith
 * @tsplus pipeable effect/core/io/Effect validateWith
 */
export function validateWith<A, R1, E1, B, C>(
  that: LazyArg<Effect<R1, E1, B>>,
  f: (a: A, b: B) => C
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R | R1, E | E1, C> =>
    self
      .exit
      .zipWith(that().exit, (ea, eb) => ea.zipWith(eb, f, (ca, cb) => Cause.then(ca, cb)))
      .flatMap((exit) => Effect.done(exit))
}
