/**
 * Transforms the environment being provided to the stream with the specified
 * function.
 *
 * @tsplus static effect/core/stream/Stream.Aspects provideSomeEnvironment
 * @tsplus pipeable effect/core/stream/Stream provideSomeEnvironment
 */
export function provideSomeEnvironment<R0, R>(
  f: (r0: Env<R0>) => Env<R>
) {
  return <E, A>(self: Stream<R, E, A>): Stream<R0, E, A> =>
    Stream.environmentWithStream((env: Env<R0>) => self.provideEnvironment(f(env)))
}
