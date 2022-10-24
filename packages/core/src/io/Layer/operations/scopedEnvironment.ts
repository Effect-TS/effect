import { ILayerScoped, ILayerSuspend } from "@effect/core/io/Layer/definition"
import type { Context } from "@fp-ts/data/Context"

/**
 * Constructs a layer from the specified scoped effect, which must return one
 * or more services.
 *
 * @tsplus static effect/core/io/Layer.Ops scopedEnvironment
 * @category constructors
 * @since 1.0.0
 */
export function scopedEnvironment<R, E, A>(
  effect: Effect<R, E, Context<A>>
): Layer<Exclude<R, Scope>, E, A> {
  return new ILayerSuspend(() => new ILayerScoped(effect))
}
