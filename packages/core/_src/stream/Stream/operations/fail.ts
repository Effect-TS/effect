/**
 * Returns a stream that always fails with the specified `error`.
 *
 * @tsplus static effect/core/stream/Stream.Ops fail
 */
export function fail<E>(
  error: LazyArg<E>,
  __tsplusTrace?: string
): Stream<never, E, never> {
  return Stream.fromEffect(Effect.failSync(error))
}
