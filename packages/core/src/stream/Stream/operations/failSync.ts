/**
 * Returns a stream that always fails with the specified `error`.
 *
 * @tsplus static effect/core/stream/Stream.Ops failSync
 * @category constructors
 * @since 1.0.0
 */
export function failSync<E>(
  error: LazyArg<E>
): Stream<never, E, never> {
  return Stream.fromEffect(Effect.failSync(error))
}
