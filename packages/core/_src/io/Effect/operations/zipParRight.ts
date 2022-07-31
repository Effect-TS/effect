/**
 * Returns an effect that executes both this effect and the specified effect,
 * in parallel, returning result of provided effect. If either side fails,
 * then the other side will be interrupted.
 *
 * @tsplus static effect/core/io/Effect.Aspects zipParRight
 * @tsplus pipeable effect/core/io/Effect zipParRight
 */
export function zipParRight<R2, E2, A2>(
  that: LazyArg<Effect<R2, E2, A2>>
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A2> =>
    self.zipWithPar(that, (_, b) => b)
}
