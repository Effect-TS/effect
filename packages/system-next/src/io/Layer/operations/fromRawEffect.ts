import type { Effect } from "../../Effect/definition/base"
import { Managed } from "../../Managed"
import type { Layer } from "../definition"
import { ILayerManaged } from "../definition"

/**
 * Creates a layer from an effect.
 *
 * @tsplus static ets/LayerOps fromRawEffect
 */
export function fromRawEffect<R, E, A>(resource: Effect<R, E, A>): Layer<R, E, A> {
  return new ILayerManaged(Managed.fromEffect(resource))
}
