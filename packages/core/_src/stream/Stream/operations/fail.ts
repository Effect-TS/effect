/**
 * Returns a stream that always fails with the specified `error`.
 *
 * @tsplus static ets/Stream/Ops fail
 */
export function fail<E>(
  error: LazyArg<E>,
  __tsplusTrace?: string
): Stream<unknown, E, never> {
  return Stream.fromEffect(Effect.fail(error))
}
