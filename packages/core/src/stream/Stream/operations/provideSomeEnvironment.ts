import type { Context } from "@fp-ts/data/Context"

/**
 * Transforms the environment being provided to the stream with the specified
 * function.
 *
 * @tsplus static effect/core/stream/Stream.Aspects provideSomeEnvironment
 * @tsplus pipeable effect/core/stream/Stream provideSomeEnvironment
 * @category environment
 * @since 1.0.0
 */
export function provideSomeEnvironment<R0, R>(
  f: (r0: Context<R0>) => Context<R>
) {
  return <E, A>(self: Stream<R, E, A>): Stream<R0, E, A> =>
    Stream.environmentWithStream((env: Context<R0>) => self.provideEnvironment(f(env)))
}
