import { ILayerApply, ILayerSuspend } from "@effect/core/io/Layer/definition"
import type { Context } from "@fp-ts/data/Context"

/**
 * Constructs a layer from the specified effect, which must return one or more
 * services.
 *
 * @tsplus static effect/core/io/Layer.Ops fromEffectEnvironment
 * @category conversions
 * @since 1.0.0
 */
export function fromEffectEnvironment<R, E, A>(
  effect: Effect<R, E, Context<A>>
): Layer<R, E, A> {
  return new ILayerSuspend(() => new ILayerApply(effect))
}
