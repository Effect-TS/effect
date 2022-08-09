/**
 * Returns an effect that executes both this effect and the specified effect,
 * in parallel, this effect result returned. If either side fails, then the
 * other side will be interrupted.
 *
 * @tsplus static effect/core/io/Effect.Aspects zipParLeft
 * @tsplus pipeable effect/core/io/Effect zipParLeft
 */
export function zipParLeft<R2, E2, A2>(that: Effect<R2, E2, A2>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A> =>
    self.zipWithPar(that, (a, _) => a)
}
