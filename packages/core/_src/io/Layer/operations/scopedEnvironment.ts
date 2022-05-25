import { ILayerScoped } from "@effect/core/io/Layer/definition"

/**
 * Constructs a layer from the specified scoped effect, which must return one
 * or more services.
 *
 * @tsplus static ets/Layer/Ops scopedEnvironment
 */
export function scopedEnvironment<R, E, A>(
  effect: LazyArg<Effect<R & Has<Scope>, E, Env<A>>>,
  __tsplusTrace?: string
): Layer<R, E, A> {
  return Layer.suspend(new ILayerScoped(effect()))
}
