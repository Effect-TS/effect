import { fromEffect } from "../../Managed/operations/fromEffect"
import type { Effect } from "../../Effect/definition/base"
import type { Layer } from "../definition"
import { ILayerManaged } from "../definition"

/**
 * Creates a layer from an effect
 */
export function fromRawEffect<R, E, A>(resource: Effect<R, E, A>): Layer<R, E, A> {
  return new ILayerManaged(fromEffect(resource))
}
