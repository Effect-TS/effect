/**
 * Returns a stream that always fails with the specified `error`.
 *
 * @tsplus static effect/core/stream/Stream.Ops failSync
 */
export function failSync<E>(
  error: LazyArg<E>
): Stream<never, E, never> {
  return Stream.fromEffect(Effect.failSync(error))
}
