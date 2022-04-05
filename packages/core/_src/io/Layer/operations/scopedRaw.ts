import { ILayerScoped } from "@effect-ts/core/io/Layer/definition";

/**
 * Constructs a layer from the specified scoped effect.
 *
 * @tsplus static ets/Layer/Ops scopedRaw
 */
export function scopedRaw<R, E, A>(
  effect: LazyArg<Effect<R & HasScope, E, A>>,
  __tsplusTrace?: string
): Layer<R, E, A> {
  return Layer.suspend(new ILayerScoped(effect()));
}
