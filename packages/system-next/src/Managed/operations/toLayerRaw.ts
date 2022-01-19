import type { Layer } from "../../Layer/definition"
import { fromRawManaged } from "../../Layer/operations/fromRawManaged"
import type { Managed } from "../definition"

/**
 * Constructs a layer from this effect.
 */
export function toLayerRaw<R, E, A>(effect: Managed<R, E, A>): Layer<R, E, A> {
  return fromRawManaged(effect)
}
