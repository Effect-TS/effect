/**
 * Constructs a layer that fails with the specified cause.
 *
 * @tsplus static effect/core/io/Layer.Ops failCause
 * @category constructors
 * @since 1.0.0
 */
export function failCause<E>(cause: LazyArg<Cause<E>>): Layer<never, E, unknown> {
  return Layer.fromEffectEnvironment(Effect.failCauseSync(cause))
}
