import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../Effect"
import type { HasScope } from "../../Scope"
import { ILayerScoped, Layer } from "../definition"

/**
 * Constructs a layer from the specified scoped effect.
 *
 * @tsplus static ets/LayerOps scopedRaw
 */
export function scopedRaw<R, E, A>(
  effect: LazyArg<Effect<R & HasScope, E, A>>,
  __tsplusTrace?: string
): Layer<R, E, A> {
  return Layer.suspend(new ILayerScoped(effect()))
}
