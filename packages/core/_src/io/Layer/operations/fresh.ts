import { ILayerFresh } from "@effect-ts/core/io/Layer/definition";

/**
 * Creates a fresh version of this layer that will not be shared.
 *
 * @tsplus fluent ets/Layer fresh
 */
export function fresh<R, E, A>(self: Layer<R, E, A>): Layer<R, E, A> {
  return new ILayerFresh(self);
}
