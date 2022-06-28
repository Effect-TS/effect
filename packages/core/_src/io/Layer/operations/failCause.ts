/**
 * Constructs a layer that fails with the specified cause.
 *
 * @tsplus static effect/core/io/Layer.Ops failCause
 */
export function failCause<E>(cause: LazyArg<Cause<E>>): Layer<never, E, unknown> {
  return Layer.fromEffectEnvironment(Effect.failCause(cause))
}
