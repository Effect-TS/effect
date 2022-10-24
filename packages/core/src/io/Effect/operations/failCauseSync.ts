/**
 * Returns an effect that models failure with the specified `Cause`.
 *
 * @tsplus static effect/core/io/Effect.Ops failCauseSync
 * @category constructors
 * @since 1.0.0
 */
export function failCauseSync<E>(cause: LazyArg<Cause<E>>): Effect<never, E, never> {
  return Effect.sync(cause).flatMap(Effect.failCause)
}
