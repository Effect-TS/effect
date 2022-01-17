// ets_tracing: off

import type { Effect } from "../../Effect/definition/base"
import { fromEffect } from "../../Managed/operations/fromEffect"
import type { Layer } from "../definition/base"
import { ILayerManaged } from "../definition/primitives"

/**
 * Creates a layer from an effect
 */
export function fromRawEffect<R, E, A>(resource: Effect<R, E, A>): Layer<R, E, A> {
  return new ILayerManaged(fromEffect(resource))
}
