/**
 * Constructs a layer from the specified scoped effect.
 *
 * @tsplus static effect/core/io/Layer.Ops scopedDiscard
 */
export function scopedDiscard<T, R, E>(
  effect: Effect<R, E, T>
): Layer<Exclude<R, Scope>, E, never> {
  return Layer.scopedEnvironment(effect.as(Env.empty))
}
