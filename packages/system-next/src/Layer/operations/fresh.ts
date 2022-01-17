// ets_tracing: off

import type { Layer } from "../definition"
import { ILayerFresh } from "../definition"

/**
 * Creates a fresh version of this layer that will not be shared.
 */
export function fresh<R, E, A>(self: Layer<R, E, A>): Layer<R, E, A> {
  return new ILayerFresh(self)
}
