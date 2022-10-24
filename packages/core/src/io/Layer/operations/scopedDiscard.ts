import * as Context from "@fp-ts/data/Context"

/**
 * Constructs a layer from the specified scoped effect.
 *
 * @tsplus static effect/core/io/Layer.Ops scopedDiscard
 * @category constructors
 * @since 1.0.0
 */
export function scopedDiscard<T, R, E>(
  effect: Effect<R, E, T>
): Layer<Exclude<R, Scope>, E, never> {
  return Layer.scopedEnvironment(effect.as(Context.empty()))
}
