import type { Managed } from "../../Managed/definition"
import type { Layer } from "../definition"
import { ILayerManaged } from "../definition"

/**
 * Creates a layer from a managed environment
 */
export function fromRawManaged<R, E, A>(resource: Managed<R, E, A>): Layer<R, E, A> {
  return new ILayerManaged(resource)
}
