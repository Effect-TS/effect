/**
 * Transforms the environment being provided to the stream with the specified
 * function.
 *
 * @tsplus fluent ets/Stream provideSomeEnvironment
 */
export function provideSomeEnvironment_<R0, R, E, A>(
  self: Stream<R, E, A>,
  f: (r0: Env<R0>) => Env<R>,
  __tsplusTrace?: string
): Stream<R0, E, A> {
  return Stream.environmentWithStream((env: Env<R0>) => self.provideEnvironment(f(env)))
}

/**
 * Transforms the environment being provided to the stream with the specified
 * function.
 *
 * @tsplus static ets/Stream/Aspects provideSomeEnvironment
 */
export const provideSomeEnvironment = Pipeable(provideSomeEnvironment_)
