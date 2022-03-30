import type { Effect } from "../../Effect/definition/base"
import type { Layer } from "../definition"
import { ILayerScoped } from "../definition"

/**
 * Creates a layer from an effect.
 *
 * @tsplus static ets/LayerOps fromRawEffect
 */
export function fromRawEffect<R, E, A>(effect: Effect<R, E, A>): Layer<R, E, A> {
  return new ILayerScoped(effect)
}
