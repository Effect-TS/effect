/**
 * Accesses the environment of the stream.
 *
 * @tsplus static ets/Stream/Ops environmentWith
 */
export function environmentWith<R, A>(
  f: (env: Env<R>) => A,
  __tsplusTrace?: string
): Stream<R, never, A> {
  return Stream.fromEffect(Effect.environmentWith(f))
}
