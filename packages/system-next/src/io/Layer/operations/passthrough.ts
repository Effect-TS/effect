import type { Layer } from "../definition"
import { and_ } from "./and"
import { environment } from "./environment"

/**
 * Returns a new layer that produces the outputs of this layer but also
 * passes through the inputs.
 */
export function passthrough<RIn, E, ROut>(
  self: Layer<RIn, E, ROut>
): Layer<RIn, E, RIn & ROut> {
  return and_(environment<RIn>(), self)
}
