import { useForever } from "../../Managed/operations/useForever"
import type { Effect } from "../../Effect/definition"
import type { Layer } from "../definition"
import { build } from "../memoMap"

/**
 * Builds this layer and uses it until it is interrupted. This is useful when
 * your entire application is a layer, such as an HTTP server.
 */
export function launch<R, E, A>(self: Layer<R, E, A>): Effect<R, E, never> {
  return useForever(build(self))
}
