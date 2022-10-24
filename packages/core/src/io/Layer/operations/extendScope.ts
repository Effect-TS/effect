import { ILayerExtendScope } from "@effect/core/io/Layer/definition"

/**
 * Extends the scope of this layer, returning a new layer that when provided
 * to an effect will not immediately release its associated resources when
 * that effect completes execution but instead when the scope the resulting
 * effect depends on is closed.
 *
 * @tsplus getter effect/core/io/Layer extendScope
 * @category mutations
 * @since 1.0.0
 */
export function extendScope<RIn, E, ROut>(
  self: Layer<RIn, E, ROut>
): Layer<RIn | Scope, E, ROut> {
  return new ILayerExtendScope(self)
}
