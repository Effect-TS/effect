import { Effect } from "../../Effect"
import type { HasScope } from "../../Scope"
import type { Layer } from "../definition"
import { ILayerScoped } from "../definition"

/**
 * Returns a scoped effect that, if evaluated, will return the lazily computed
 * result of this layer.
 *
 * @tsplus fluent ets/Layer memoize
 */
export function memoize<RIn, E, ROut>(
  self: Layer<RIn, E, ROut>
): Effect<HasScope, never, Layer<RIn, E, ROut>> {
  return Effect.scopeWith((scope) => self.buildWithScope(scope))
    .memoize()
    .map((effect) => new ILayerScoped(effect))
}
