import type { Context } from "@fp-ts/data/Context"

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @tsplus static effect/core/io/Effect.Aspects provideSomeEnvironment
 * @tsplus pipeable effect/core/io/Effect provideSomeEnvironment
 * @category environment
 * @since 1.0.0
 */
export function provideSomeEnvironment<R0, R>(f: (context: Context<R0>) => Context<R>) {
  return <E, A>(self: Effect<R, E, A>): Effect<R0, E, A> =>
    Effect.environmentWithEffect((context: Context<R0>) => self.provideEnvironment(f(context)))
}
