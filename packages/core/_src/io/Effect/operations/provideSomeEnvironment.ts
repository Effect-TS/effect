/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @tsplus static effect/core/io/Effect.Aspects provideSomeEnvironment
 * @tsplus pipeable effect/core/io/Effect provideSomeEnvironment
 */
export function provideSomeEnvironment<R0, R>(
  f: (r0: Env<R0>) => Env<R>,
  __tsplusTrace?: string
) {
  return <E, A>(self: Effect<R, E, A>): Effect<R0, E, A> =>
    Effect.environmentWithEffect((r0: Env<R0>) => self.provideEnvironment(f(r0)))
}
