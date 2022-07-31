/**
 * Accesses the environment of the stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops environmentWith
 */
export function environmentWith<R, A>(
  f: (env: Env<R>) => A
): Stream<R, never, A> {
  return Stream.fromEffect(Effect.environmentWith(f))
}
