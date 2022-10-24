import { ILayerScoped } from "@effect/core/io/Layer/definition"

/**
 * Returns a scoped effect that, if evaluated, will return the lazily computed
 * result of this layer.
 *
 * @tsplus getter effect/core/io/Layer memoize
 * @category mapping
 * @since 1.0.0
 */
export function memoize<RIn, E, ROut>(
  self: Layer<RIn, E, ROut>
): Effect<Scope, never, Layer<RIn, E, ROut>> {
  return Effect.scopeWith((scope) => self.buildWithScope(scope))
    .memoize
    .map((effect) => new ILayerScoped(effect))
}
