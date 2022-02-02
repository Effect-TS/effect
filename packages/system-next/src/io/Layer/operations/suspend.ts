import type { LazyArg } from "../../../data/Function"
import type { Layer } from "../definition"
import { ILayerSuspend } from "../definition"

/**
 * Lazily constructs a layer. This is useful to avoid infinite recursion when
 * creating layers that refer to themselves.
 *
 * @tsplus static ets/LayerOps suspend
 */
export function suspend<RIn, E, ROut>(
  f: LazyArg<Layer<RIn, E, ROut>>
): Layer<RIn, E, ROut> {
  return new ILayerSuspend(f)
}
