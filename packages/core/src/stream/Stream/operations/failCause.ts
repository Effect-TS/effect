/**
 * Returns a stream that always fails with the specified `Cause`.
 *
 * @tsplus static effect/core/stream/Stream.Ops failCause
 * @category constructors
 * @since 1.0.0
 */
export function failCause<E>(cause: Cause<E>): Stream<never, E, never> {
  return Stream.fromEffect(Effect.failCause(cause))
}
