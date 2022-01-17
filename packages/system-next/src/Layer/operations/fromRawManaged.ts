// ets_tracing: off

import type { Managed } from "../../Managed/definition"
import type { Layer } from "../definition/base"
import { ILayerManaged } from "../definition/primitives"

/**
 * Creates a layer from a managed environment
 */
export function fromRawManaged<R, E, A>(resource: Managed<R, E, A>): Layer<R, E, A> {
  return new ILayerManaged(resource)
}
