import { ILayerApply } from "@effect/core/io/Layer/definition"

/**
 * Constructs a layer from the specified effect, which must return one or more
 * services.
 *
 * @tsplus static effect/core/io/Layer.Ops fromEffectEnvironment
 */
export function fromEffectEnvironment<R, E, A>(
  effect: LazyArg<Effect<R, E, Env<A>>>,
  __tsplusTrace?: string
): Layer<R, E, A> {
  return Layer.suspend(new ILayerApply(effect()))
}
