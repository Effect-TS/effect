import { ILayerExtendScope } from "@effect-ts/core/io/Layer/definition";

/**
 * Extends the scope of this layer, returning a new layer that when provided
 * to an effect will not immediately release its associated resources when
 * that effect completes execution but instead when the scope the resulting
 * effect depends on is closed.
 *
 * @tsplus fluent ets/Layer extendScope
 */
export function extendScope<RIn, E, ROut>(
  self: Layer<RIn, E, ROut>,
  __tsplusTrace?: string
): Layer<RIn & HasScope, E, ROut> {
  return new ILayerExtendScope(self);
}
