import { Stream } from "../definition"

/**
 * Transforms the environment being provided to the stream with the specified
 * function.
 *
 * @tsplus fluent ets/Stream provideSomeEnvironment
 */
export function provideSomeEnvironment_<R0, R, E, A>(
  self: Stream<R, E, A>,
  env: (r0: R0) => R,
  __tsplusTrace?: string
): Stream<R0, E, A> {
  return Stream.environmentWithStream((r0: R0) => self.provideEnvironment(env(r0)))
}

/**
 * Transforms the environment being provided to the stream with the specified
 * function.
 */
export const provideSomeEnvironment = Pipeable(provideSomeEnvironment_)
