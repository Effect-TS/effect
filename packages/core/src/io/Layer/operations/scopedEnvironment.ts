import { ILayerScoped } from "@effect/core/io/Layer/definition"

/**
 * Constructs a layer from the specified scoped effect, which must return one
 * or more services.
 *
 * @tsplus static effect/core/io/Layer.Ops scopedEnvironment
 */
export function scopedEnvironment<R, E, A>(
  effect: Effect<R, E, Env<A>>
): Layer<Exclude<R, Scope>, E, A> {
  return Layer.suspend(new ILayerScoped(effect))
}
