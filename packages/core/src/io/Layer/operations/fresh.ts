import { ILayerFresh } from "@effect/core/io/Layer/definition"

/**
 * Creates a fresh version of this layer that will not be shared.
 *
 * @tsplus getter effect/core/io/Layer fresh
 * @category getters
 * @since 1.0.0
 */
export function fresh<R, E, A>(self: Layer<R, E, A>): Layer<R, E, A> {
  return new ILayerFresh(self)
}
