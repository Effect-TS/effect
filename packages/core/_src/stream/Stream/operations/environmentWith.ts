/**
 * Accesses the environment of the stream.
 *
 * @tsplus static ets/Stream/Ops environmentWith
 */
export function environmentWith<R, A>(
  f: (r: R) => A,
  __tsplusTrace?: string
): Stream<R, never, A> {
  return Stream.fromEffect(Effect.environmentWith(f));
}
