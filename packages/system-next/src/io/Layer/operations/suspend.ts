import type { Layer } from "../definition"
import { ILayerSuspend } from "../definition"

/**
 * Lazily constructs a layer. This is useful to avoid infinite recursion when
 * creating layers that refer to themselves.
 */
export function suspend<RIn, E, ROut>(
  f: () => Layer<RIn, E, ROut>
): Layer<RIn, E, ROut> {
  return new ILayerSuspend(f)
}
