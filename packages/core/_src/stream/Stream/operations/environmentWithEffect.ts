/**
 * Accesses the environment of the stream in the context of an effect.
 *
 * @tsplus static effect/core/stream/Stream.Ops environmentWithEffect
 */
export function environmentWithEffect<R0, R, E, A>(
  f: (env: Env<R0>) => Effect<R, E, A>
): Stream<R0 | R, E, A> {
  return Stream.environment<R0>().mapEffect(f)
}
