/**
 * Returns an effect that executes both this effect and the specified effect,
 * in parallel, combining their results with the specified `f` function. If
 * both sides fail, then the cause will be combined.
 *
 * @tsplus static effect/core/io/Effect.Aspects validateWithPar
 * @tsplus pipeable effect/core/io/Effect validateWithPar
 */
export function validateWithPar<A, R1, E1, B, C>(
  that: LazyArg<Effect<R1, E1, B>>,
  f: (a: A, b: B) => C,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R | R1, E | E1, C> =>
    self
      .exit
      .zipWithPar(that().exit, (ea, eb) => ea.zipWith(eb, f, (ca, cb) => Cause.both(ca, cb)))
      .flatMap((exit) => Effect.done(exit))
}
