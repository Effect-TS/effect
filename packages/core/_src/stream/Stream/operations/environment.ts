/**
 * Accesses the whole environment of the stream.
 *
 * @tsplus static ets/Stream/Ops environment
 */
export function environment<R>(__tsplusTrace?: string): Stream<R, never, R> {
  return Stream.fromEffect(Effect.environment<R>());
}
